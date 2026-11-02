use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum EventKind {
    AppIntercepted,
    AppUnlocked,
    AppKilled,
    UnlockFailed,
    LockedOut,
    FolderLocked,
    FolderUnlocked,
    LockAll,
    AppAdded,
    AppRemoved,
    FolderAdded,
    FolderRemoved,
}

impl std::fmt::Display for EventKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let label = match self {
            EventKind::AppIntercepted => "App Intercepted",
            EventKind::AppUnlocked => "App Unlocked",
            EventKind::AppKilled => "App Terminated",
            EventKind::UnlockFailed => "Unlock Failed",
            EventKind::LockedOut => "Account Locked Out",
            EventKind::FolderLocked => "Folder Locked",
            EventKind::FolderUnlocked => "Folder Unlocked",
            EventKind::LockAll => "Lock All Triggered",
            EventKind::AppAdded => "App Added",
            EventKind::AppRemoved => "App Removed",
            EventKind::FolderAdded => "Folder Added",
            EventKind::FolderRemoved => "Folder Removed",
        };
        write!(f, "{}", label)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEvent {
    pub id: String,
    pub timestamp: u64,
    pub kind: EventKind,
    pub target_name: String,
    pub details: String,
}

// ---------------------------------------------------------------------------
// File path helper
// ---------------------------------------------------------------------------

fn log_file_path() -> PathBuf {
    let base = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ClayLock");
    fs::create_dir_all(&base).ok();
    base.join("activity.log")
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Append a new event to the activity log (JSON Lines format).
pub fn append_event(kind: EventKind, target_name: &str, details: &str) {
    let path = log_file_path();

    let id = format!(
        "evt_{:016x}_{:04x}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64,
        rand::random::<u16>()
    );

    let event = LogEvent {
        id,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        kind,
        target_name: target_name.to_string(),
        details: details.to_string(),
    };

    if let Ok(line) = serde_json::to_string(&event) {
        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&path) {
            let _ = writeln!(file, "{}", line);
        }
    }
}

/// Read the last `limit` events from the activity log (newest first).
pub fn get_events(limit: usize) -> Vec<LogEvent> {
    let path = log_file_path();

    let file = match fs::File::open(&path) {
        Ok(f) => f,
        Err(_) => return vec![],
    };

    let reader = BufReader::new(file);
    let mut events: Vec<LogEvent> = reader
        .lines()
        .filter_map(|line| {
            let line = line.ok()?;
            let trimmed = line.trim().to_string();
            if trimmed.is_empty() {
                return None;
            }
            serde_json::from_str::<LogEvent>(&trimmed).ok()
        })
        .collect();

    // Newest first
    events.reverse();

    if limit > 0 && events.len() > limit {
        events.truncate(limit);
    }

    events
}

/// Copy the log file to the user-chosen export path.
pub fn export_log(destination: &str) -> Result<(), String> {
    let src = log_file_path();
    if !src.exists() {
        return Err("No activity log file found — nothing to export yet.".to_string());
    }
    fs::copy(&src, destination).map_err(|e| e.to_string())?;
    Ok(())
}

/// Return the path of the log file as a string (for display in UI).
pub fn log_file_path_string() -> String {
    log_file_path().to_string_lossy().to_string()
}
