use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;
use rand::rngs::OsRng;
use rand::Rng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatus {
    pub is_onboarded: bool,
    pub is_locked_out: bool,
    pub lockout_remaining_secs: u64,
    pub failed_attempts: u32,
}

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("Incorrect master password")]
    InvalidPassword,
    #[error("System locked out. Try again in {0} seconds")]
    LockedOut(u64),
    #[error("Cryptographic operation failed: {0}")]
    CryptoError(String),
    #[error("Invalid recovery key")]
    InvalidRecoveryKey,
}

/// Hashes password with Argon2id + cryptographically secure random salt
pub fn hash_password(password: &str) -> Result<String, AuthError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    
    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| AuthError::CryptoError(e.to_string()))
}

/// Verifies candidate password against stored Argon2id hash
pub fn verify_password(candidate: &str, password_hash: &str) -> Result<bool, AuthError> {
    let parsed_hash = PasswordHash::new(password_hash)
        .map_err(|e| AuthError::CryptoError(e.to_string()))?;
        
    let argon2 = Argon2::default();
    match argon2.verify_password(candidate.as_bytes(), &parsed_hash) {
        Ok(_) => Ok(true),
        Err(argon2::password_hash::Error::Password) => Ok(false),
        Err(e) => Err(AuthError::CryptoError(e.to_string())),
    }
}

/// Generates a 24-character human-friendly recovery key formatted in 6 groups of 4:
/// Example: "K7WQ-9MN2-4RTV-X8YZ-3BCH-6PJF"
/// Returns (plain_key_for_user, hashed_key_for_storage)
pub fn generate_recovery_key() -> Result<(String, String), AuthError> {
    // Unambiguous character set (no 0/O, 1/I/l)
    const CHARSET: &[u8] = b"23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let mut rng = OsRng;
    
    let mut raw_chars = Vec::with_capacity(24);
    for _ in 0..24 {
        let idx = rng.gen_range(0..CHARSET.len());
        raw_chars.push(CHARSET[idx] as char);
    }
    
    // Group into 6 segments of 4 characters: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
    let formatted_key = raw_chars
        .chunks(4)
        .map(|chunk| chunk.iter().collect::<String>())
        .collect::<Vec<String>>()
        .join("-");
        
    let key_hash = hash_password(&formatted_key)?;
    Ok((formatted_key, key_hash))
}

/// Verifies candidate recovery key against stored Argon2id recovery hash
pub fn verify_recovery_key(candidate: &str, recovery_hash: &str) -> Result<bool, AuthError> {
    // Normalize: uppercase and trim spaces
    let clean_candidate = candidate.trim().to_uppercase();
    verify_password(&clean_candidate, recovery_hash)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hashing_and_verification() {
        let password = "SuperSecretPassword#2026";
        let hash = hash_password(password).expect("Hashing should succeed");
        
        assert!(hash.starts_with("$argon2id$"));
        assert!(verify_password(password, &hash).unwrap());
        assert!(!verify_password("WrongPassword123", &hash).unwrap());
    }

    #[test]
    fn test_recovery_key_generation_and_validation() {
        let (raw_key, hash) = generate_recovery_key().expect("Key generation should succeed");
        
        // 24 characters + 5 hyphens = 29 characters total
        assert_eq!(raw_key.len(), 29);
        assert_eq!(raw_key.matches('-').count(), 5);
        
        assert!(verify_recovery_key(&raw_key, &hash).unwrap());
        assert!(verify_recovery_key(&raw_key.to_lowercase(), &hash).unwrap());
        assert!(!verify_recovery_key("AAAA-BBBB-CCCC-DDDD-EEEE-FFFF", &hash).unwrap());
    }
}
