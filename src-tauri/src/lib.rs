pub mod activity_log;
pub mod app_discovery;
pub mod auth;
pub mod config;
pub mod folder_lock;
pub mod process_control;
pub mod tray;
pub mod watcher;

use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct OnboardingResult {
    pub recovery_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerifyResult {
    pub success: bool,
    pub attempts_remaining: u32,
    pub is_locked_out: bool,
    pub lockout_remaining_secs: u64,
}

pub struct AppState {
    pub config: Arc<Mutex<config::AppConfig>>,
    pub intercepted_process: Arc<Mutex<Option<watcher::InterceptedApp>>>,
    pub session_tracker: Arc<Mutex<watcher::SessionTracker>>,
}

// ---------------------------------------------------------------------------
// Authentication Commands
// ---------------------------------------------------------------------------

#[tauri::command]
fn get_auth_state(state: tauri::State<'_, AppState>) -> Result<auth::AuthStatus, String> {
    let cfg = state.config.lock().map_err(|e| e.to_string())?;
    let (is_locked_out, lockout_remaining_secs) = config::check_lockout(&cfg);

    Ok(auth::AuthStatus {
        is_onboarded: cfg.is_onboarded,
        is_locked_out,
        lockout_remaining_secs,
        failed_attempts: cfg.failed_attempts,
    })
}

#[tauri::command]
fn setup_onboarding(
    password: String,
    state: tauri::State<'_, AppState>,
) -> Result<OnboardingResult, String> {
    if password.len() < 8 {
        return Err("Password must be at least 8 characters long".to_string());
    }

    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;
    if cfg.is_onboarded {
        return Err("Application is already onboarded".to_string());
    }

    let password_hash = auth::hash_password(&password).map_err(|e| e.to_string())?;
    let (raw_recovery_key, recovery_hash) =
        auth::generate_recovery_key().map_err(|e| e.to_string())?;

    cfg.master_password_hash = password_hash;
    cfg.recovery_key_hash = recovery_hash;
    cfg.is_onboarded = true;
    cfg.failed_attempts = 0;
    cfg.locked_until_timestamp = 0;

    config::save_config(&cfg).map_err(|e| e.to_string())?;

    Ok(OnboardingResult {
        recovery_key: raw_recovery_key,
    })
}

#[tauri::command]
fn verify_master_password(
    password: String,
    state: tauri::State<'_, AppState>,
) -> Result<VerifyResult, String> {
    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;

    let (is_locked_out, lockout_remaining_secs) = config::check_lockout(&cfg);
    if is_locked_out {
        return Ok(VerifyResult {
            success: false,
            attempts_remaining: 0,
            is_locked_out: true,
            lockout_remaining_secs,
        });
    }

    let is_valid =
        auth::verify_password(&password, &cfg.master_password_hash).map_err(|e| e.to_string())?;

    if is_valid {
        config::record_successful_attempt(&mut cfg);
        config::save_config(&cfg).map_err(|e| e.to_string())?;

        Ok(VerifyResult {
            success: true,
            attempts_remaining: 3,
            is_locked_out: false,
            lockout_remaining_secs: 0,
        })
    } else {
        let (locked_out, remaining, duration) = config::record_failed_attempt(&mut cfg);
        config::save_config(&cfg).map_err(|e| e.to_string())?;

        Ok(VerifyResult {
            success: false,
            attempts_remaining: remaining,
            is_locked_out: locked_out,
            lockout_remaining_secs: duration,
        })
    }
}

#[tauri::command]
fn recover_with_key(
    recovery_key: String,
    new_password: String,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    if new_password.len() < 8 {
        return Err("New password must be at least 8 characters long".to_string());
    }

    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;

    let is_valid = auth::verify_recovery_key(&recovery_key, &cfg.recovery_key_hash)
        .map_err(|e| e.to_string())?;

    if !is_valid {
        return Err("Invalid recovery key".to_string());
    }

    let new_hash = auth::hash_password(&new_password).map_err(|e| e.to_string())?;
    cfg.master_password_hash = new_hash;
    config::record_successful_attempt(&mut cfg);

    config::save_config(&cfg).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn change_password(
    current_password: String,
    new_password: String,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    if new_password.len() < 8 {
        return Err("New password must be at least 8 characters long".to_string());
    }

    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;

    let is_valid = auth::verify_password(&current_password, &cfg.master_password_hash)
        .map_err(|e| e.to_string())?;

    if !is_valid {
        return Err("Current master password is incorrect".to_string());
    }

    let new_hash = auth::hash_password(&new_password).map_err(|e| e.to_string())?;
    cfg.master_password_hash = new_hash;
    config::save_config(&cfg).map_err(|e| e.to_string())?;
    Ok(true)
}

// ---------------------------------------------------------------------------
// Phase 3 & 4: Protected Applications & Folders Management
// ---------------------------------------------------------------------------

#[tauri::command]
fn get_protected_apps(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<config::ProtectedAppItem>, String> {
    let cfg = state.config.lock().map_err(|e| e.to_string())?;
    Ok(cfg.protected_apps.clone())
}

fn show_and_bring_to_front(window: &tauri::WebviewWindow) {
    let _ = window.center();
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_always_on_top(true);
    let _ = window.set_focus();

    #[cfg(windows)]
    unsafe {
        use windows::Win32::Foundation::{HWND, TRUE, FALSE};
        use windows::Win32::UI::WindowsAndMessaging::{
            BringWindowToTop, GetForegroundWindow, SetForegroundWindow, SetWindowPos, ShowWindow,
            HWND_TOPMOST, SWP_NOMOVE, SWP_NOSIZE, SW_RESTORE, SW_SHOW,
        };
        use windows::Win32::System::Threading::{AttachThreadInput, GetCurrentThreadId};

        if let Ok(hwnd) = window.hwnd() {
            let win_hwnd = HWND(hwnd.0 as _);
            let _ = ShowWindow(win_hwnd, SW_RESTORE);
            let _ = ShowWindow(win_hwnd, SW_SHOW);
            let _ = SetWindowPos(win_hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE);

            let fore_hwnd = GetForegroundWindow();
            let fore_thread = windows::Win32::UI::WindowsAndMessaging::GetWindowThreadProcessId(fore_hwnd, None);
            let cur_thread = GetCurrentThreadId();

            if fore_thread != 0 && fore_thread != cur_thread {
                let _ = AttachThreadInput(cur_thread, fore_thread, TRUE);
                let _ = BringWindowToTop(win_hwnd);
                let _ = SetForegroundWindow(win_hwnd);
                let _ = AttachThreadInput(cur_thread, fore_thread, FALSE);
            } else {
                let _ = BringWindowToTop(win_hwnd);
                let _ = SetForegroundWindow(win_hwnd);
            }
        }
    }
}

fn check_and_intercept_running_app(
    app_name: &str,
    executable_path: &str,
    session_tracker: &Arc<Mutex<watcher::SessionTracker>>,
    intercepted_process: &Arc<Mutex<Option<watcher::InterceptedApp>>>,
    app_handle: &tauri::AppHandle,
) {
    let pids = watcher::get_current_process_pids();
    let target_norm = watcher::normalize_path(executable_path);
    let target_file = std::path::Path::new(executable_path)
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or(executable_path)
        .to_lowercase();

    for pid in pids {
        let is_unlocked = session_tracker
            .lock()
            .map(|s| s.is_unlocked(pid))
            .unwrap_or(false);
        if is_unlocked {
            continue;
        }

        if let Some(exe) = process_control::get_process_executable_path(pid) {
            let exe_norm = watcher::normalize_path(&exe);
            let running_file = std::path::Path::new(&exe_norm)
                .file_name()
                .and_then(|f| f.to_str())
                .unwrap_or(&exe_norm)
                .to_lowercase();

            if !process_control::is_denylisted(&exe_norm)
                && watcher::matches_target_app(&target_norm, &target_file, &exe_norm, &running_file)
            {
                let _ = process_control::suspend_process(pid);
                process_control::hide_process_windows(pid);

                let item = watcher::InterceptedApp {
                    pid,
                    name: app_name.to_string(),
                    executable_path: exe,
                    intercepted_at: config::current_epoch_seconds(),
                };

                if let Ok(mut guard) = intercepted_process.lock() {
                    *guard = Some(item.clone());
                }

                if let Some(win) = app_handle.get_webview_window("unlock-overlay") {
                    show_and_bring_to_front(&win);
                    let _ = win.emit("app_intercepted", &item);
                } else if let Some(win) = app_handle.get_webview_window("main") {
                    show_and_bring_to_front(&win);
                    let _ = win.emit("app_intercepted", &item);
                }
                let _ = app_handle.emit("app_intercepted", &item);
                break;
            }
        }
    }
}

#[tauri::command]
fn add_protected_app(
    name: String,
    executable_path: String,
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<config::ProtectedAppItem, String> {
    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;

    let normalized_path = watcher::normalize_path(&executable_path);
    if cfg
        .protected_apps
        .iter()
        .any(|a| watcher::normalize_path(&a.executable_path) == normalized_path)
    {
        return Err("This application is already on your protected list".to_string());
    }

    let id = format!(
        "app_{}_{:04x}",
        config::current_epoch_seconds(),
        rand::random::<u16>()
    );

    let item = config::ProtectedAppItem {
        id,
        name: name.trim().to_string(),
        executable_path: executable_path.trim().to_string(),
        is_locked: true,
        added_at: config::current_epoch_seconds(),
    };

    cfg.protected_apps.push(item.clone());
    config::save_config(&cfg).map_err(|e| e.to_string())?;
    drop(cfg);

    activity_log::append_event(
        activity_log::EventKind::AppAdded,
        &item.name,
        &format!("Protected: {}", item.executable_path),
    );

    check_and_intercept_running_app(
        &item.name,
        &item.executable_path,
        &state.session_tracker,
        &state.intercepted_process,
        &app_handle,
    );

    Ok(item)
}

#[tauri::command]
fn toggle_app_lock(
    id: String,
    is_locked: bool,
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;

    if let Some(app) = cfg.protected_apps.iter_mut().find(|a| a.id == id) {
        app.is_locked = is_locked;
        let app_name = app.name.clone();
        let app_path = app.executable_path.clone();
        config::save_config(&cfg).map_err(|e| e.to_string())?;
        drop(cfg);

        if is_locked {
            activity_log::append_event(
                activity_log::EventKind::LockAll,
                &app_name,
                "Protection lock activated",
            );
            check_and_intercept_running_app(
                &app_name,
                &app_path,
                &state.session_tracker,
                &state.intercepted_process,
                &app_handle,
            );
        } else {
            activity_log::append_event(
                activity_log::EventKind::AppUnlocked,
                &app_name,
                "Protection paused by user",
            );
        }
        Ok(true)
    } else {
        Err("Protected application not found".to_string())
    }
}

#[tauri::command]
fn remove_protected_app(id: String, state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;
    let removed_name = cfg.protected_apps.iter().find(|a| a.id == id).map(|a| a.name.clone());
    let orig_len = cfg.protected_apps.len();
    cfg.protected_apps.retain(|a| a.id != id);

    if cfg.protected_apps.len() != orig_len {
        config::save_config(&cfg).map_err(|e| e.to_string())?;
        if let Some(name) = removed_name {
            activity_log::append_event(activity_log::EventKind::AppRemoved, &name, "Removed from protected list");
        }
        Ok(true)
    } else {
        Err("Protected application not found".to_string())
    }
}

#[tauri::command]
fn get_protected_folders(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<folder_lock::ProtectedFolder>, String> {
    let cfg = state.config.lock().map_err(|e| e.to_string())?;
    Ok(cfg.protected_folders.clone())
}

#[tauri::command]
fn add_protected_folder(
    name: String,
    path: String,
    lock_immediately: bool,
    state: tauri::State<'_, AppState>,
) -> Result<folder_lock::ProtectedFolder, String> {
    let trimmed_path = path.trim().to_string();

    let p = Path::new(&trimmed_path);
    if !p.is_dir() {
        return Err(format!(
            "The specified path is not an accessible directory: {}",
            trimmed_path
        ));
    }

    if folder_lock::is_system_folder(&trimmed_path) {
        return Err(format!(
            "System protected folder cannot be locked for OS stability: {}",
            trimmed_path
        ));
    }

    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;
    let normalized = trimmed_path.to_lowercase().replace('/', "\\");

    if cfg
        .protected_folders
        .iter()
        .any(|f| f.path.to_lowercase().replace('/', "\\") == normalized)
    {
        return Err("This folder is already on your protected list".to_string());
    }

    if lock_immediately {
        folder_lock::lock_folder_ntfs(&trimmed_path).map_err(|e| e.to_string())?;
    }

    let folder_name = if name.trim().is_empty() {
        p.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Protected Folder")
            .to_string()
    } else {
        name.trim().to_string()
    };

    let id = format!(
        "folder_{}_{:04x}",
        config::current_epoch_seconds(),
        rand::random::<u16>()
    );

    let item = folder_lock::ProtectedFolder {
        id,
        name: folder_name,
        path: trimmed_path,
        is_locked: lock_immediately,
        added_at: config::current_epoch_seconds(),
    };

    cfg.protected_folders.push(item.clone());
    config::save_config(&cfg).map_err(|e| e.to_string())?;

    activity_log::append_event(
        activity_log::EventKind::FolderAdded,
        &item.name,
        &format!("Path: {}", item.path),
    );

    Ok(item)
}

#[tauri::command]
fn toggle_folder_lock(
    id: String,
    is_locked: bool,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;

    let folder_opt = cfg.protected_folders.iter_mut().find(|f| f.id == id);
    if let Some(folder) = folder_opt {
        if is_locked {
            folder_lock::lock_folder_ntfs(&folder.path).map_err(|e| e.to_string())?;
            activity_log::append_event(
                activity_log::EventKind::FolderLocked,
                &folder.name,
                "NTFS ACL deny applied",
            );
        } else {
            folder_lock::unlock_folder_ntfs(&folder.path).map_err(|e| e.to_string())?;
            activity_log::append_event(
                activity_log::EventKind::FolderUnlocked,
                &folder.name,
                "NTFS ACL access restored",
            );
        }
        folder.is_locked = is_locked;
        config::save_config(&cfg).map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Err("Protected folder not found".to_string())
    }
}

#[tauri::command]
fn remove_protected_folder(id: String, state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;

    let removed_name = cfg.protected_folders.iter().find(|f| f.id == id).map(|f| f.name.clone());
    if let Some(folder) = cfg.protected_folders.iter().find(|f| f.id == id) {
        if folder.is_locked {
            let _ = folder_lock::unlock_folder_ntfs(&folder.path);
        }
    }

    let orig_len = cfg.protected_folders.len();
    cfg.protected_folders.retain(|f| f.id != id);

    if cfg.protected_folders.len() != orig_len {
        config::save_config(&cfg).map_err(|e| e.to_string())?;
        if let Some(name) = removed_name {
            activity_log::append_event(activity_log::EventKind::FolderRemoved, &name, "Removed from protected list");
        }
        Ok(true)
    } else {
        Err("Protected folder not found".to_string())
    }
}

#[tauri::command]
fn scan_installed_apps() -> Result<Vec<app_discovery::DiscoveredApp>, String> {
    app_discovery::scan_installed_apps().map_err(|e| e.to_string())
}

#[tauri::command]
fn pick_executable() -> Result<Option<String>, String> {
    app_discovery::pick_executable_dialog()
}

#[tauri::command]
fn pick_folder() -> Result<Option<String>, String> {
    app_discovery::pick_folder_dialog()
}

// ---------------------------------------------------------------------------
// Phase 4: Process Interception, Suspension, and Unlock Commands
// ---------------------------------------------------------------------------

#[tauri::command]
fn get_intercepted_app(
    state: tauri::State<'_, AppState>,
) -> Result<Option<watcher::InterceptedApp>, String> {
    let proc = state.intercepted_process.lock().map_err(|e| e.to_string())?;
    Ok(proc.clone())
}

#[tauri::command]
fn unlock_intercepted_app(
    password: String,
    state: tauri::State<'_, AppState>,
) -> Result<VerifyResult, String> {
    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;

    let (is_locked_out, lockout_remaining_secs) = config::check_lockout(&cfg);
    if is_locked_out {
        return Ok(VerifyResult {
            success: false,
            attempts_remaining: 0,
            is_locked_out: true,
            lockout_remaining_secs,
        });
    }

    let is_valid =
        auth::verify_password(&password, &cfg.master_password_hash).map_err(|e| e.to_string())?;

    if is_valid {
        config::record_successful_attempt(&mut cfg);
        config::save_config(&cfg).map_err(|e| e.to_string())?;

        // Resume process and restore windows
        let mut intercepted_guard = state
            .intercepted_process
            .lock()
            .map_err(|e| e.to_string())?;

        if let Some(intercepted) = intercepted_guard.take() {
            let _ = process_control::resume_process(intercepted.pid);
            process_control::show_process_windows(intercepted.pid);

            activity_log::append_event(
                activity_log::EventKind::AppUnlocked,
                &intercepted.name,
                &format!("PID {} resumed via NtResumeProcess", intercepted.pid),
            );

            // Add PID to session tracker with grace period
            if let Ok(mut tracker) = state.session_tracker.lock() {
                tracker.unlock_session(intercepted.pid, cfg.grace_period_minutes);
            }
        }

        Ok(VerifyResult {
            success: true,
            attempts_remaining: 3,
            is_locked_out: false,
            lockout_remaining_secs: 0,
        })
    } else {
        let (locked_out, remaining, duration) = config::record_failed_attempt(&mut cfg);
        config::save_config(&cfg).map_err(|e| e.to_string())?;

        // Log failed attempt
        {
            let intercepted_guard = state.intercepted_process.lock().map_err(|e| e.to_string())?;
            if let Some(ref intercepted) = *intercepted_guard {
                activity_log::append_event(
                    activity_log::EventKind::UnlockFailed,
                    &intercepted.name,
                    &format!("{} attempts remaining", remaining),
                );
            }
        }

        // If locked out (3 consecutive failures), terminate the intercepted process!
        if locked_out {
            let mut intercepted_guard = state
                .intercepted_process
                .lock()
                .map_err(|e| e.to_string())?;

            if let Some(intercepted) = intercepted_guard.take() {
                activity_log::append_event(
                    activity_log::EventKind::AppKilled,
                    &intercepted.name,
                    "Terminated after 3 failed unlock attempts",
                );
                let _ = process_control::terminate_process(intercepted.pid);
            }

            activity_log::append_event(
                activity_log::EventKind::LockedOut,
                "ClayLock",
                &format!("Locked out for {} seconds", duration),
            );
        }

        Ok(VerifyResult {
            success: false,
            attempts_remaining: remaining,
            is_locked_out: locked_out,
            lockout_remaining_secs: duration,
        })
    }
}

#[tauri::command]
fn cancel_intercepted_app(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let mut intercepted_guard = state
        .intercepted_process
        .lock()
        .map_err(|e| e.to_string())?;

    if let Some(intercepted) = intercepted_guard.take() {
        let _ = process_control::terminate_process(intercepted.pid);
    }

    Ok(true)
}

#[tauri::command]
fn simulate_intercept_app(
    name: String,
    executable_path: String,
    state: tauri::State<'_, AppState>,
) -> Result<watcher::InterceptedApp, String> {
    let intercepted = watcher::InterceptedApp {
        pid: 99999,
        name,
        executable_path,
        intercepted_at: config::current_epoch_seconds(),
    };

    let mut guard = state
        .intercepted_process
        .lock()
        .map_err(|e| e.to_string())?;
    *guard = Some(intercepted.clone());

    Ok(intercepted)
}

// ---------------------------------------------------------------------------
// Phase 5: Settings, Autostart & Lock All Commands
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct AppSettings {
    pub grace_period_minutes: u32,
    pub start_with_windows: bool,
    pub theme: String,
}

#[tauri::command]
fn get_app_settings(state: tauri::State<'_, AppState>) -> Result<AppSettings, String> {
    let cfg = state.config.lock().map_err(|e| e.to_string())?;
    let start_with_windows = config::is_autostart_enabled();

    Ok(AppSettings {
        grace_period_minutes: cfg.grace_period_minutes,
        start_with_windows,
        theme: cfg.theme.clone(),
    })
}

#[tauri::command]
fn update_app_settings(
    grace_period_minutes: u32,
    start_with_windows: bool,
    theme: String,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;

    cfg.grace_period_minutes = grace_period_minutes;
    cfg.start_with_windows = start_with_windows;
    cfg.theme = theme;

    let _ = config::set_autostart(start_with_windows);
    config::save_config(&cfg).map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
fn lock_all_items(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;

    // 1. Lock all applications
    for app in &mut cfg.protected_apps {
        app.is_locked = true;
    }

    // 2. Lock all folders via NTFS ACL
    for folder in &mut cfg.protected_folders {
        let _ = folder_lock::lock_folder_ntfs(&folder.path);
        folder.is_locked = true;
    }

    let apps_to_intercept = cfg
        .protected_apps
        .iter()
        .map(|a| (a.name.clone(), a.executable_path.clone()))
        .collect::<Vec<_>>();

    config::save_config(&cfg).map_err(|e| e.to_string())?;
    drop(cfg);

    // 3. Intercept any currently running instances of newly locked apps
    for (name, path) in apps_to_intercept {
        check_and_intercept_running_app(
            &name,
            &path,
            &state.session_tracker,
            &state.intercepted_process,
            &app_handle,
        );
    }

    Ok(true)
}

// ---------------------------------------------------------------------------
// Phase 5: Activity Log Commands
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LogEventDto {
    pub id: String,
    pub timestamp: u64,
    pub kind: String,
    pub target_name: String,
    pub details: String,
}

#[tauri::command]
fn get_activity_log(limit: Option<usize>) -> Result<Vec<LogEventDto>, String> {
    let events = activity_log::get_events(limit.unwrap_or(200));
    Ok(events
        .into_iter()
        .map(|e| LogEventDto {
            id: e.id,
            timestamp: e.timestamp,
            kind: e.kind.to_string(),
            target_name: e.target_name,
            details: e.details,
        })
        .collect())
}

#[tauri::command]
fn export_activity_log(destination: String) -> Result<bool, String> {
    activity_log::export_log(&destination).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn get_log_file_path() -> String {
    activity_log::log_file_path_string()
}

#[tauri::command]
fn pick_file() -> Result<Option<String>, String> {
    app_discovery::pick_file_dialog()
}

#[tauri::command]
fn open_protected_item(path: String) -> Result<bool, String> {
    folder_lock::open_path_in_os(&path)?;
    Ok(true)
}

#[tauri::command]
fn restore_window_after_unlock(should_hide: bool, app_handle: tauri::AppHandle) -> Result<bool, String> {
    if let Some(window) = app_handle.get_webview_window("unlock-overlay") {
        let _ = window.set_always_on_top(false);
        if should_hide {
            let _ = window.hide();
        }
    }
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.set_always_on_top(false);
        if should_hide {
            let _ = window.hide();
        }
    }
    Ok(true)
}

// ---------------------------------------------------------------------------
// Application Runner
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_config = config::load_config().unwrap_or(None).unwrap_or_default();
    let config_arc = Arc::new(Mutex::new(initial_config));
    let session_tracker = Arc::new(Mutex::new(watcher::SessionTracker::new()));
    let intercepted_process = Arc::new(Mutex::new(None));

    // Watcher thread setup
    let watcher_config_ref = Arc::clone(&config_arc);
    let watcher_sessions_ref = Arc::clone(&session_tracker);
    let watcher_intercepted_ref = Arc::clone(&intercepted_process);

    let get_locked_apps = Arc::new(move || {
        let cfg = watcher_config_ref.lock().unwrap();
        cfg.protected_apps
            .iter()
            .filter(|a| a.is_locked)
            .map(|a| (a.name.clone(), a.executable_path.clone()))
            .collect::<Vec<(String, String)>>()
    });

    let config_grace_ref = Arc::clone(&config_arc);
    let get_grace_period = Arc::new(move || {
        let cfg = config_grace_ref.lock().unwrap();
        cfg.grace_period_minutes
    });

    let app_state = AppState {
        config: Arc::clone(&config_arc),
        intercepted_process: Arc::clone(&intercepted_process),
        session_tracker: Arc::clone(&session_tracker),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            let app_handle = app.handle().clone();

            // 1. Setup System Tray
            let _ = tray::setup_tray(&app_handle);

            // 2. Setup Main & Overlay Window Event Handlers (Minimize to tray on Close)
            if let Some(main_window) = app_handle.get_webview_window("main") {
                let win_clone = main_window.clone();
                main_window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win_clone.hide();
                    }
                });

                // Check if launched with --minimized flag (Windows Autostart)
                let args: Vec<String> = std::env::args().collect();
                if args.iter().any(|arg| arg == "--minimized") {
                    let _ = main_window.hide();
                }
            }

            if let Some(overlay_window) = app_handle.get_webview_window("unlock-overlay") {
                let win_clone = overlay_window.clone();
                let close_intercepted_ref = Arc::clone(&intercepted_process);
                overlay_window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if let Ok(mut guard) = close_intercepted_ref.lock() {
                            if let Some(proc) = guard.take() {
                                let _ = process_control::terminate_process(proc.pid);
                            }
                        }
                        let _ = win_clone.hide();
                    }
                });
            }

            // 3. Start background watcher loop
            watcher::start_watcher_loop(
                get_locked_apps,
                get_grace_period,
                move |intercepted| {
                    if let Ok(mut guard) = watcher_intercepted_ref.lock() {
                        *guard = Some(intercepted.clone());
                    }
                    if let Some(window) = app_handle.get_webview_window("unlock-overlay") {
                        show_and_bring_to_front(&window);
                        let _ = window.emit("app_intercepted", &intercepted);
                    } else if let Some(window) = app_handle.get_webview_window("main") {
                        show_and_bring_to_front(&window);
                        let _ = window.emit("app_intercepted", &intercepted);
                    }
                    let _ = app_handle.emit("app_intercepted", &intercepted);
                },
                watcher_sessions_ref,
            );

            Ok(())
        })
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            get_auth_state,
            setup_onboarding,
            verify_master_password,
            recover_with_key,
            change_password,
            // Phase 3 App & Folder Commands
            get_protected_apps,
            add_protected_app,
            toggle_app_lock,
            remove_protected_app,
            get_protected_folders,
            add_protected_folder,
            toggle_folder_lock,
            remove_protected_folder,
            scan_installed_apps,
            pick_executable,
            pick_folder,
            pick_file,
            open_protected_item,
            restore_window_after_unlock,
            // Phase 4 Interception & Unlock Commands
            get_intercepted_app,
            unlock_intercepted_app,
            cancel_intercepted_app,
            simulate_intercept_app,
            // Phase 5 Settings, Autostart & Activity Log Commands
            get_app_settings,
            update_app_settings,
            lock_all_items,
            get_activity_log,
            export_activity_log,
            get_log_file_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running Quick Lock application");
}
