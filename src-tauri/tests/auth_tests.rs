use quick_lock_lib::auth::*;
use quick_lock_lib::config::*;

#[test]
fn test_master_password_argon2id() {
    let password = "CorrectMasterPassword#123";
    let hash = hash_password(password).expect("Hash generation failed");

    assert!(hash.starts_with("$argon2id$"));
    assert!(verify_password(password, &hash).expect("Verification failed"));
    assert!(!verify_password("IncorrectPassword", &hash).expect("Verification failed"));
}

#[test]
fn test_recovery_key_format_and_validation() {
    let (key, hash) = generate_recovery_key().expect("Key generation failed");

    // Must be 24 alphanumeric chars split into 6 groups of 4: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
    assert_eq!(key.len(), 29);
    assert_eq!(key.matches('-').count(), 5);

    assert!(verify_recovery_key(&key, &hash).expect("Recovery key verification failed"));
    assert!(verify_recovery_key(&key.to_lowercase(), &hash).expect("Case-insensitive match failed"));
    assert!(!verify_recovery_key("INVALID-RECOVERY-KEY-12345", &hash).expect("Invalid key passed"));
}

#[test]
fn test_encrypted_config_persistence_and_roundtrip() {
    let mut config = AppConfig::default();
    config.is_onboarded = true;
    config.master_password_hash = "$argon2id$v=19$m=19456...".to_string();
    config.recovery_key_hash = "$argon2id$v=19$m=19456...".to_string();
    config.grace_period_minutes = 5;
    config.failed_attempts = 1;

    let encrypted = encrypt_config(&config).expect("Encryption failed");
    assert!(encrypted.len() > 32);

    let decrypted = decrypt_config(&encrypted).expect("Decryption failed");
    assert_eq!(decrypted.is_onboarded, true);
    assert_eq!(decrypted.grace_period_minutes, 5);
    assert_eq!(decrypted.failed_attempts, 1);
    assert_eq!(decrypted.master_password_hash, config.master_password_hash);
}

#[test]
fn test_lockout_exponential_backoff() {
    let mut config = AppConfig::default();

    // 1st failed attempt -> 2 attempts remaining
    let (locked, remaining, _) = record_failed_attempt(&mut config);
    assert!(!locked);
    assert_eq!(remaining, 2);

    // 2nd failed attempt -> 1 attempt remaining
    let (locked, remaining, _) = record_failed_attempt(&mut config);
    assert!(!locked);
    assert_eq!(remaining, 1);

    // 3rd failed attempt -> locked out for 30s
    let (locked, remaining, duration) = record_failed_attempt(&mut config);
    assert!(locked);
    assert_eq!(remaining, 0);
    assert_eq!(duration, 30);

    // 4th failed attempt -> locked out doubling to 60s
    let (locked, remaining, duration) = record_failed_attempt(&mut config);
    assert!(locked);
    assert_eq!(remaining, 0);
    assert_eq!(duration, 60);

    // 5th failed attempt -> locked out doubling to 120s
    let (locked, remaining, duration) = record_failed_attempt(&mut config);
    assert!(locked);
    assert_eq!(remaining, 0);
    assert_eq!(duration, 120);

    // Successful attempt resets lockout
    record_successful_attempt(&mut config);
    assert_eq!(config.failed_attempts, 0);
    assert_eq!(config.locked_until_timestamp, 0);
}
