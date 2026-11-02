use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtectedFolder {
    pub id: String,
    pub name: String,
    pub path: String,
    pub is_locked: bool,
    pub added_at: u64,
}

#[derive(Debug, thiserror::Error)]
pub enum FolderLockError {
    #[error("Folder does not exist or is not a directory: {0}")]
    NotFound(String),
    #[error("Folder is protected by system denylist and cannot be locked: {0}")]
    SystemProtected(String),
    #[error("Failed to modify NTFS ACL permissions: {0}")]
    AclError(String),
}

/// Hardcoded system directories that must NEVER be locked to protect OS stability
pub const SYSTEM_FOLDER_DENYLIST: &[&str] = &[
    "c:\\windows",
    "c:\\program files",
    "c:\\program files (x86)",
    "c:\\users",
    "c:\\programdata",
    "c:\\",
    "d:\\",
    "e:\\",
    "f:\\",
];

/// Checks if directory is in system denylist or is an essential OS path
pub fn is_system_folder(path_str: &str) -> bool {
    let normalized = path_str.trim().to_lowercase().replace('/', "\\");
    let trimmed = normalized.trim_end_matches('\\');

    // 1. Root drives
    if trimmed.len() <= 2 && trimmed.ends_with(':') {
        return true;
    }
    if trimmed.len() == 3 && trimmed.ends_with(":\\") {
        return true;
    }

    // 2. Exact match on denylist
    for item in SYSTEM_FOLDER_DENYLIST {
        let item_trimmed = item.trim_end_matches('\\');
        if trimmed == item_trimmed {
            return true;
        }
    }

    // 3. System drive Windows directory
    if trimmed.contains("\\windows") && !trimmed.contains("\\appdata") {
        return true;
    }

    // 4. AppData\ClayLock itself
    if trimmed.contains("claylock") {
        return true;
    }

    false
}

/// Locks a file or directory by applying restrictive NTFS Access Control List (Deny Everyone / Users)
pub fn lock_folder_ntfs(path_str: &str) -> Result<(), FolderLockError> {
    let p = Path::new(path_str);
    if !p.exists() {
        return Err(FolderLockError::NotFound(path_str.to_string()));
    }

    if is_system_folder(path_str) {
        return Err(FolderLockError::SystemProtected(path_str.to_string()));
    }

    #[cfg(windows)]
    {
        // Use icacls to set Deny ACE for Everyone (S-1-1-0)
        // For directories: (OI)(CI)(F) = Object Inherit, Container Inherit, Full Access Deny
        // For individual files: (F) = Full Access Deny
        let deny_arg = if p.is_dir() {
            "*S-1-1-0:(OI)(CI)(F)"
        } else {
            "*S-1-1-0:F"
        };

        let status = Command::new("icacls")
            .arg(path_str)
            .arg("/deny")
            .arg(deny_arg)
            .output();

        match status {
            Ok(output) if output.status.success() => Ok(()),
            Ok(output) => {
                let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
                Err(FolderLockError::AclError(err_msg))
            }
            Err(e) => Err(FolderLockError::AclError(e.to_string())),
        }
    }

    #[cfg(not(windows))]
    {
        Ok(())
    }
}

/// Unlocks a file or directory by removing Deny ACE from NTFS ACL
pub fn unlock_folder_ntfs(path_str: &str) -> Result<(), FolderLockError> {
    let p = Path::new(path_str);
    if !p.exists() {
        return Err(FolderLockError::NotFound(path_str.to_string()));
    }

    #[cfg(windows)]
    {
        let status = Command::new("icacls")
            .arg(path_str)
            .arg("/remove:d")
            .arg("*S-1-1-0")
            .output();

        match status {
            Ok(output) if output.status.success() => Ok(()),
            Ok(output) => {
                let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
                Err(FolderLockError::AclError(err_msg))
            }
            Err(e) => Err(FolderLockError::AclError(e.to_string())),
        }
    }

    #[cfg(not(windows))]
    {
        Ok(())
    }
}

/// Opens a file or directory in the default Windows application or Explorer
pub fn open_path_in_os(path_str: &str) -> Result<(), String> {
    #[cfg(windows)]
    {
        Command::new("cmd")
            .args(&["/c", "start", "", path_str])
            .spawn()
            .map_err(|e| format!("Failed to open path: {}", e))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_folder_denylist() {
        assert!(is_system_folder("C:\\"));
        assert!(is_system_folder("C:"));
        assert!(is_system_folder("d:\\"));
        assert!(is_system_folder("c:\\windows"));
        assert!(is_system_folder("C:\\Windows\\System32"));
        assert!(is_system_folder("C:\\Program Files"));
        assert!(is_system_folder("C:\\Program Files (x86)"));
        assert!(is_system_folder("C:\\Users\\nikhi\\AppData\\Roaming\\ClayLock"));

        // Non-system user folders should be safe to protect
        assert!(!is_system_folder("C:\\Users\\nikhi\\Documents\\MyVault"));
        assert!(!is_system_folder("D:\\Projects\\Confidential"));
        assert!(!is_system_folder("N:\\Locker\\UserFolder"));
    }
}
