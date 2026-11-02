use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use rand::rngs::OsRng;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtectedAppItem {
    pub id: String,
    pub name: String,
    pub executable_path: String,
    pub is_locked: boolean_type::Bool,
    pub added_at: u64,
}

mod boolean_type {
    pub type Bool = bool;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub master_password_hash: String,
    pub recovery_key_hash: String,
    pub is_onboarded: bool,
    pub grace_period_minutes: u32, // 0, 1, 5, 15
    pub start_with_windows: bool,
    pub theme: String,             // "light", "dark", "system"
    pub failed_attempts: u32,
    pub locked_until_timestamp: u64,
    pub current_lockout_duration_secs: u64,
    #[serde(default)]
    pub protected_apps: Vec<ProtectedAppItem>,
    #[serde(default)]
    pub protected_folders: Vec<crate::folder_lock::ProtectedFolder>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            master_password_hash: String::new(),
            recovery_key_hash: String::new(),
            is_onboarded: false,
            grace_period_minutes: 0,
            start_with_windows: true,
            theme: "system".to_string(),
            failed_attempts: 0,
            locked_until_timestamp: 0,
            current_lockout_duration_secs: 30,
            protected_apps: Vec::new(),
            protected_folders: Vec::new(),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("Configuration directory could not be resolved")]
    PathResolutionError,
    #[error("Failed to read/write config file: {0}")]
    IoError(String),
    #[error("DPAPI protection failed: {0}")]
    DpapiError(String),
    #[error("AES-256-GCM encryption/decryption failed: {0}")]
    CryptoError(String),
    #[error("Serialization error: {0}")]
    SerializationError(String),
}

/// Resolves path to %APPDATA%\ClayLock\config.enc
pub fn get_config_path() -> Result<PathBuf, ConfigError> {
    let app_data = std::env::var("APPDATA")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| ConfigError::PathResolutionError)?;

    let mut path = PathBuf::from(app_data);
    path.push("ClayLock");
    fs::create_dir_all(&path).map_err(|e| ConfigError::IoError(e.to_string()))?;
    path.push("config.enc");
    Ok(path)
}

/// Current epoch time in seconds
pub fn current_epoch_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

// ---------------------------------------------------------------------------
// DPAPI Key Protection (Windows Native CryptProtectData / CryptUnprotectData)
// ---------------------------------------------------------------------------

#[cfg(windows)]
mod dpapi {
    use super::ConfigError;
    use windows::Win32::Security::Cryptography::{
        CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };

    extern "system" {
        fn LocalFree(hmem: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
    }

    pub fn protect_bytes(plain: &[u8]) -> Result<Vec<u8>, ConfigError> {
        let in_blob = CRYPT_INTEGER_BLOB {
            cbData: plain.len() as u32,
            pbData: plain.as_ptr() as *mut u8,
        };
        let mut out_blob = CRYPT_INTEGER_BLOB {
            cbData: 0,
            pbData: std::ptr::null_mut(),
        };

        unsafe {
            CryptProtectData(
                &in_blob,
                None,
                None,
                None,
                None,
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut out_blob,
            )
            .map_err(|e| ConfigError::DpapiError(e.to_string()))?;

            let slice = std::slice::from_raw_parts(out_blob.pbData, out_blob.cbData as usize);
            let protected = slice.to_vec();
            let _ = LocalFree(out_blob.pbData as _);
            Ok(protected)
        }
    }

    pub fn unprotect_bytes(protected: &[u8]) -> Result<Vec<u8>, ConfigError> {
        let in_blob = CRYPT_INTEGER_BLOB {
            cbData: protected.len() as u32,
            pbData: protected.as_ptr() as *mut u8,
        };
        let mut out_blob = CRYPT_INTEGER_BLOB {
            cbData: 0,
            pbData: std::ptr::null_mut(),
        };

        unsafe {
            CryptUnprotectData(
                &in_blob,
                None,
                None,
                None,
                None,
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut out_blob,
            )
            .map_err(|e| ConfigError::DpapiError(e.to_string()))?;

            let slice = std::slice::from_raw_parts(out_blob.pbData, out_blob.cbData as usize);
            let unprotected = slice.to_vec();
            let _ = LocalFree(out_blob.pbData as _);
            Ok(unprotected)
        }
    }
}

#[cfg(not(windows))]
mod dpapi {
    use super::ConfigError;
    // Cross-platform mock for testing environments
    pub fn protect_bytes(plain: &[u8]) -> Result<Vec<u8>, ConfigError> {
        let mut obfuscated = plain.to_vec();
        for b in &mut obfuscated {
            *b ^= 0x5C;
        }
        Ok(obfuscated)
    }

    pub fn unprotect_bytes(protected: &[u8]) -> Result<Vec<u8>, ConfigError> {
        let mut plain = protected.to_vec();
        for b in &mut plain {
            *b ^= 0x5C;
        }
        Ok(plain)
    }
}

// ---------------------------------------------------------------------------
// AES-256-GCM + DPAPI Encrypted Persistence
// ---------------------------------------------------------------------------

/// Encrypts configuration with random AES-256-GCM key and DPAPI-protected envelope
pub fn encrypt_config(config: &AppConfig) -> Result<Vec<u8>, ConfigError> {
    let json_bytes = serde_json::to_vec(config)
        .map_err(|e| ConfigError::SerializationError(e.to_string()))?;

    // 1. Generate 32-byte AES key
    let mut aes_key_bytes = [0u8; 32];
    OsRng.fill_bytes(&mut aes_key_bytes);

    // 2. Encrypt AES key using Windows DPAPI
    let dpapi_blob = dpapi::protect_bytes(&aes_key_bytes)?;

    // 3. Generate 12-byte random Nonce
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // 4. Encrypt payload with AES-256-GCM
    let cipher = Aes256Gcm::new_from_slice(&aes_key_bytes)
        .map_err(|e| ConfigError::CryptoError(e.to_string()))?;
    let ciphertext = cipher
        .encrypt(nonce, json_bytes.as_ref())
        .map_err(|e| ConfigError::CryptoError(e.to_string()))?;

    // 5. Serialize into envelope:
    // [dpapi_blob_len: u32 LE] [dpapi_blob] [nonce: 12 bytes] [ciphertext + tag]
    let mut envelope = Vec::with_capacity(4 + dpapi_blob.len() + 12 + ciphertext.len());
    envelope.extend_from_slice(&(dpapi_blob.len() as u32).to_le_bytes());
    envelope.extend_from_slice(&dpapi_blob);
    envelope.extend_from_slice(&nonce_bytes);
    envelope.extend_from_slice(&ciphertext);

    Ok(envelope)
}

/// Decrypts configuration envelope using DPAPI and AES-256-GCM
pub fn decrypt_config(data: &[u8]) -> Result<AppConfig, ConfigError> {
    if data.len() < 16 {
        return Err(ConfigError::CryptoError("Data too short".to_string()));
    }

    // Read DPAPI blob length
    let mut len_bytes = [0u8; 4];
    len_bytes.copy_from_slice(&data[0..4]);
    let dpapi_len = u32::from_le_bytes(len_bytes) as usize;

    if data.len() < 4 + dpapi_len + 12 {
        return Err(ConfigError::CryptoError("Corrupt envelope".to_string()));
    }

    let dpapi_blob = &data[4..4 + dpapi_len];
    let nonce_bytes = &data[4 + dpapi_len..4 + dpapi_len + 12];
    let ciphertext = &data[4 + dpapi_len + 12..];

    // Decrypt AES key with DPAPI
    let aes_key_bytes = dpapi::unprotect_bytes(dpapi_blob)?;
    if aes_key_bytes.len() != 32 {
        return Err(ConfigError::CryptoError("Invalid decrypted key length".to_string()));
    }

    let cipher = Aes256Gcm::new_from_slice(&aes_key_bytes)
        .map_err(|e| ConfigError::CryptoError(e.to_string()))?;
    let nonce = Nonce::from_slice(nonce_bytes);

    let decrypted_bytes = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| ConfigError::CryptoError(e.to_string()))?;

    let config: AppConfig = serde_json::from_slice(&decrypted_bytes)
        .map_err(|e| ConfigError::SerializationError(e.to_string()))?;

    Ok(config)
}

/// Loads configuration from %APPDATA%\ClayLock\config.enc
pub fn load_config() -> Result<Option<AppConfig>, ConfigError> {
    let path = get_config_path()?;
    if !path.exists() {
        return Ok(None);
    }

    let data = fs::read(&path).map_err(|e| ConfigError::IoError(e.to_string()))?;
    let config = decrypt_config(&data)?;
    Ok(Some(config))
}

/// Saves encrypted configuration to %APPDATA%\ClayLock\config.enc
pub fn save_config(config: &AppConfig) -> Result<(), ConfigError> {
    let path = get_config_path()?;
    let encrypted = encrypt_config(config)?;
    fs::write(&path, encrypted).map_err(|e| ConfigError::IoError(e.to_string()))?;
    Ok(())
}

/// Evaluates lock out state and computes remaining seconds
pub fn check_lockout(config: &AppConfig) -> (bool, u64) {
    let now = current_epoch_seconds();
    if config.locked_until_timestamp > now {
        (true, config.locked_until_timestamp - now)
    } else {
        (false, 0)
    }
}

/// Handles failed password attempt with exponential backoff:
/// 30 s after 3 failures, doubling each subsequent failure (30s, 60s, 120s...)
pub fn record_failed_attempt(config: &mut AppConfig) -> (bool, u32, u64) {
    config.failed_attempts += 1;
    let now = current_epoch_seconds();

    if config.failed_attempts >= 3 {
        let failure_exponent = config.failed_attempts - 3;
        // 30s * 2^exponent
        let duration = 30u64.saturating_mul(1u64 << failure_exponent.min(10));
        config.current_lockout_duration_secs = duration;
        config.locked_until_timestamp = now + duration;
        (true, 0, duration)
    } else {
        let attempts_remaining = 3 - config.failed_attempts;
        (false, attempts_remaining, 0)
    }
}

/// Resets failed attempts after successful master unlock
pub fn record_successful_attempt(config: &mut AppConfig) {
    config.failed_attempts = 0;
    config.locked_until_timestamp = 0;
    config.current_lockout_duration_secs = 30;
}

// ---------------------------------------------------------------------------
// Windows Startup Autostart (HKCU\Software\Microsoft\Windows\CurrentVersion\Run)
// Pure Win32 Registry API (Zero Subprocesses, Zero reg.exe, Zero Errors)
// ---------------------------------------------------------------------------

#[cfg(windows)]
use windows::core::PCWSTR;
#[cfg(windows)]
use windows::Win32::System::Registry::{
    RegCloseKey, RegDeleteValueW, RegOpenKeyExW, RegQueryValueExW, RegSetValueExW,
    HKEY, HKEY_CURRENT_USER, KEY_READ, KEY_WRITE, REG_SZ,
};

pub fn is_autostart_enabled() -> bool {
    #[cfg(windows)]
    unsafe {
        let run_key: Vec<u16> = r"Software\Microsoft\Windows\CurrentVersion\Run"
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        let val_name: Vec<u16> = "QuickLock\0".encode_utf16().collect();
        let mut hkey = HKEY::default();

        if RegOpenKeyExW(HKEY_CURRENT_USER, PCWSTR(run_key.as_ptr()), 0, KEY_READ, &mut hkey).is_ok() {
            let mut data_len = 0u32;
            let res = RegQueryValueExW(
                hkey,
                PCWSTR(val_name.as_ptr()),
                None,
                None,
                None,
                Some(&mut data_len),
            );
            let _ = RegCloseKey(hkey);
            return res.is_ok() && data_len > 0;
        }
    }
    false
}

pub fn set_autostart(enable: bool) -> Result<bool, String> {
    #[cfg(windows)]
    unsafe {
        let run_key: Vec<u16> = r"Software\Microsoft\Windows\CurrentVersion\Run"
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        let val_name: Vec<u16> = "QuickLock\0".encode_utf16().collect();
        let mut hkey = HKEY::default();

        if enable {
            let current_exe = std::env::current_exe()
                .map_err(|e| format!("Failed to get current executable path: {}", e))?;
            let exe_str = current_exe.to_string_lossy();
            let val_data = format!("\"{}\" --minimized", exe_str);
            let wide_data: Vec<u16> = val_data.encode_utf16().chain(std::iter::once(0)).collect();

            if RegOpenKeyExW(HKEY_CURRENT_USER, PCWSTR(run_key.as_ptr()), 0, KEY_WRITE, &mut hkey).is_ok() {
                let bytes: &[u8] = std::slice::from_raw_parts(
                    wide_data.as_ptr() as *const u8,
                    wide_data.len() * std::mem::size_of::<u16>(),
                );
                let res = RegSetValueExW(
                    hkey,
                    PCWSTR(val_name.as_ptr()),
                    0,
                    REG_SZ,
                    Some(bytes),
                );
                let _ = RegCloseKey(hkey);
                if res.is_err() {
                    return Err(format!("Failed to set registry value: {:?}", res));
                }
            } else {
                return Err("Failed to open HKCU Run registry key for writing".into());
            }
        } else {
            if RegOpenKeyExW(HKEY_CURRENT_USER, PCWSTR(run_key.as_ptr()), 0, KEY_WRITE, &mut hkey).is_ok() {
                let _ = RegDeleteValueW(hkey, PCWSTR(val_name.as_ptr()));
                let _ = RegCloseKey(hkey);
            }
        }
        Ok(enable)
    }

    #[cfg(not(windows))]
    {
        Ok(enable)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_encryption_decryption_roundtrip() {
        let mut config = AppConfig::default();
        config.is_onboarded = true;
        config.master_password_hash = "$argon2id$v=19$m=19456...".to_string();
        config.recovery_key_hash = "$argon2id$v=19$m=19456...".to_string();
        config.grace_period_minutes = 5;

        let encrypted = encrypt_config(&config).expect("Encryption should succeed");
        assert!(encrypted.len() > 32);

        let decrypted = decrypt_config(&encrypted).expect("Decryption should succeed");
        assert_eq!(decrypted.is_onboarded, true);
        assert_eq!(decrypted.grace_period_minutes, 5);
        assert_eq!(decrypted.master_password_hash, config.master_password_hash);
    }

    #[test]
    fn test_lockout_backoff_progression() {
        let mut config = AppConfig::default();
        
        // 1st fail: 2 remaining, no lockout
        let (locked, remaining, duration) = record_failed_attempt(&mut config);
        assert!(!locked);
        assert_eq!(remaining, 2);
        assert_eq!(duration, 0);

        // 2nd fail: 1 remaining, no lockout
        let (locked, remaining, duration) = record_failed_attempt(&mut config);
        assert!(!locked);
        assert_eq!(remaining, 1);
        assert_eq!(duration, 0);

        // 3rd fail: locked out for 30s
        let (locked, remaining, duration) = record_failed_attempt(&mut config);
        assert!(locked);
        assert_eq!(remaining, 0);
        assert_eq!(duration, 30);

        // 4th fail: locked out doubling to 60s
        let (locked, remaining, duration) = record_failed_attempt(&mut config);
        assert!(locked);
        assert_eq!(remaining, 0);
        assert_eq!(duration, 60);

        // Success resets lockout
        record_successful_attempt(&mut config);
        assert_eq!(config.failed_attempts, 0);
        assert_eq!(config.locked_until_timestamp, 0);
    }
}
