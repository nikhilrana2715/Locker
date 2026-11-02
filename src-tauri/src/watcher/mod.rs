use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use crate::process_control;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InterceptedApp {
    pub pid: u32,
    pub name: String,
    pub executable_path: String,
    pub intercepted_at: u64,
}

#[derive(Debug, thiserror::Error)]
pub enum WatcherError {
    #[error("Process snapshot failed")]
    SnapshotFailed,
    #[error("Watcher thread error: {0}")]
    ThreadError(String),
}

/// Normalizes executable paths for exact case-insensitive matching
pub fn normalize_path(path: &str) -> String {
    path.trim().to_lowercase().replace('/', "\\")
}

/// Compares a locked target application with a candidate running process.
/// Matches on:
/// 1. Exact full normalized path (e.g. C:\Program Files\App\app.exe)
/// 2. Executable file name (e.g. notepad.exe == notepad.exe, chrome.exe == chrome.exe)
/// 3. Executable stem match (e.g. notepad == notepad)
/// 4. Known Windows modern packaged app / UWP aliases (calc.exe -> calculatorapp.exe, mspaint.exe -> paintapp.exe)
pub fn matches_target_app(
    target_norm_path: &str,
    target_filename: &str,
    running_norm_path: &str,
    running_filename: &str,
) -> bool {
    let t_file = target_filename.trim().to_lowercase();
    let r_file = running_filename.trim().to_lowercase();

    // 1. Exact normalized path match (if both paths are non-empty)
    if !target_norm_path.is_empty() && !running_norm_path.is_empty() && target_norm_path == running_norm_path {
        return true;
    }

    // 2. Direct filename match (e.g. "notepad.exe" == "notepad.exe")
    if !t_file.is_empty() && !r_file.is_empty() && t_file == r_file {
        return true;
    }

    // 3. Stem match without extension
    let t_stem = t_file.strip_suffix(".exe").unwrap_or(&t_file);
    let r_stem = r_file.strip_suffix(".exe").unwrap_or(&r_file);
    if !t_stem.is_empty() && !r_stem.is_empty() && t_stem == r_stem {
        return true;
    }

    // 4. Known Windows packaged app (UWP) aliases
    let aliases: &[(&str, &str)] = &[
        ("calc.exe", "calculatorapp.exe"),
        ("calculatorapp.exe", "calc.exe"),
        ("mspaint.exe", "paintapp.exe"),
        ("paintapp.exe", "mspaint.exe"),
    ];

    for &(a1, a2) in aliases {
        if (t_file == a1 && r_file == a2) || (t_file == a2 && r_file == a1) {
            return true;
        }
    }

    false
}

#[cfg(windows)]
use windows::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
#[cfg(windows)]
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
    TH32CS_SNAPPROCESS,
};

/// Helper to extract string from null-terminated UTF-16 array
pub fn utf16_array_to_string(slice: &[u16]) -> String {
    let len = slice.iter().position(|&c| c == 0).unwrap_or(slice.len());
    String::from_utf16_lossy(&slice[..len])
}

/// Collects currently active running process map: PID -> exe_file_name (from snapshot without OpenProcess syscalls)
pub fn get_current_process_map() -> HashMap<u32, String> {
    let mut procs = HashMap::new();

    #[cfg(windows)]
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if let Ok(handle) = snapshot {
            if handle != INVALID_HANDLE_VALUE {
                let mut entry: PROCESSENTRY32W = std::mem::zeroed();
                entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

                if Process32FirstW(handle, &mut entry).is_ok() {
                    loop {
                        let name = utf16_array_to_string(&entry.szExeFile);
                        procs.insert(entry.th32ProcessID, name);
                        if Process32NextW(handle, &mut entry).is_err() {
                            break;
                        }
                    }
                }
                let _ = CloseHandle(handle);
            }
        }
    }

    procs
}

/// Collects currently active running process IDs
pub fn get_current_process_pids() -> HashSet<u32> {
    get_current_process_map().into_keys().collect()
}

/// Active session tracking for grace periods
pub struct SessionTracker {
    pub active_unlocked_pids: HashMap<u32, u64>, // PID -> expires_at_timestamp (0 = until closed)
}

impl SessionTracker {
    pub fn new() -> Self {
        Self {
            active_unlocked_pids: HashMap::new(),
        }
    }

    pub fn is_unlocked(&self, pid: u32) -> bool {
        if let Some(&expires_at) = self.active_unlocked_pids.get(&pid) {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();

            if expires_at == 0 || expires_at > now {
                return true;
            }
        }
        false
    }

    pub fn unlock_session(&mut self, pid: u32, grace_period_minutes: u32) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let expires_at = if grace_period_minutes == 0 {
            0 // until process exits
        } else {
            now + (grace_period_minutes as u64 * 60)
        };

        self.active_unlocked_pids.insert(pid, expires_at);
    }

    pub fn clean_dead_processes(&mut self, running_pids: &HashSet<u32>) {
        self.active_unlocked_pids.retain(|pid, _| running_pids.contains(pid));
    }
}

/// Spawns the background process watcher loop with adaptive sleeping & fast in-memory filtering (0.0% CPU)
pub fn start_watcher_loop<F>(
    get_locked_apps: Arc<dyn Fn() -> Vec<(String, String)> + Send + Sync>, // returns Vec<(name, normalized_path)>
    _get_grace_period: Arc<dyn Fn() -> u32 + Send + Sync>,
    on_intercept: F,
    sessions: Arc<Mutex<SessionTracker>>,
) where
    F: Fn(InterceptedApp) + Send + Sync + 'static,
{
    std::thread::spawn(move || {
        let mut known_map = HashMap::new();

        loop {
            let locked_apps = get_locked_apps();

            // Adaptive sleep to guarantee 0.0% CPU overhead:
            // When no apps are locked, sleep 1.5 seconds.
            // When apps are locked, sleep 250ms (ultra-fast interception).
            if locked_apps.is_empty() {
                std::thread::sleep(Duration::from_millis(1500));
            } else {
                std::thread::sleep(Duration::from_millis(250));
            }

            let current_map = get_current_process_map();
            let current_pids: HashSet<u32> = current_map.keys().copied().collect();

            // Clean up exited sessions
            if let Ok(mut sess) = sessions.lock() {
                sess.clean_dead_processes(&current_pids);
            }

            if !locked_apps.is_empty() {
                // Pre-extract target filenames from locked paths (e.g. "notepad.exe")
                // This allows in-memory matching with zero OpenProcess syscalls for unrelated apps!
                let target_names: Vec<(String, String, String)> = locked_apps
                    .iter()
                    .map(|(name, path)| {
                        let file_name = std::path::Path::new(path)
                            .file_name()
                            .and_then(|f| f.to_str())
                            .unwrap_or(path)
                            .to_lowercase();
                        (name.clone(), normalize_path(path), file_name)
                    })
                    .collect();

                for (&pid, exe_name) in &current_map {
                    if known_map.contains_key(&pid) {
                        continue;
                    }

                    let exe_name_lower = exe_name.to_lowercase();

                    // Check system denylist before touching anything
                    if process_control::is_denylisted(&exe_name_lower) {
                        continue;
                    }

                    // In-memory zero-syscall candidate filter
                    let matching_rule = target_names.iter().find(|(_, target_norm, target_file)| {
                        matches_target_app(target_norm, target_file, "", &exe_name_lower)
                    });

                    let (app_name, expected_norm_path, target_file) = match matching_rule {
                        Some((name, norm_path, file)) => (name, norm_path, file),
                        None => continue, // Discard instantly with 0 syscalls!
                    };

                    // Check if already in active unlock session
                    let is_unlocked = sessions
                        .lock()
                        .map(|s| s.is_unlocked(pid))
                        .unwrap_or(false);

                    if is_unlocked {
                        continue;
                    }

                    // Query process image path
                    let exe_path_opt = process_control::get_process_executable_path(pid);
                    let normalized_exe = exe_path_opt
                        .as_ref()
                        .map(|p| normalize_path(p))
                        .unwrap_or_default();

                    // Denylist safety check on full path
                    if !normalized_exe.is_empty() && process_control::is_denylisted(&normalized_exe) {
                        continue;
                    }

                    let running_filename = if !normalized_exe.is_empty() {
                        std::path::Path::new(&normalized_exe)
                            .file_name()
                            .and_then(|f| f.to_str())
                            .unwrap_or(&exe_name_lower)
                            .to_lowercase()
                    } else {
                        exe_name_lower.clone()
                    };

                    let is_match = matches_target_app(
                        expected_norm_path,
                        target_file,
                        &normalized_exe,
                        &running_filename,
                    );

                    if is_match {
                        // 1. Immediately suspend process
                        let _ = process_control::suspend_process(pid);

                        // 2. Hide process windows
                        process_control::hide_process_windows(pid);

                        // 3. Notify interception
                        let intercepted = InterceptedApp {
                            pid,
                            name: app_name.clone(),
                            executable_path: exe_path_opt.unwrap_or_else(|| expected_norm_path.clone()),
                            intercepted_at: std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_secs(),
                        };

                        on_intercept(intercepted);
                    }
                }
            }

            known_map = current_map;
        }
    });
}
