# Quick Lock (ClayLock) - Implementation Plan

Quick Lock is an enterprise-grade Windows 10/11 desktop application locker engineered with Tauri 2 (Rust backend) and React + TypeScript + Tailwind CSS, wrapped in a tactile Claymorphism user interface.

---

## Phases Overview

### Phase 1: Scaffolding, Design Tokens & Clay Component Library
- [x] Scaffold Vite + React 18 + TypeScript + Tailwind CSS + Framer Motion project
- [x] Scaffold Tauri 2 configuration and Rust module structure (`src-tauri`)
- [x] Define comprehensive design tokens (`src/tokens/clay.tokens.ts`) with soft pastels, radii, dual inset shadows
- [x] Implement core Clay component library:
  - [x] `ClayButton` (multi-variant, Framer Motion scale & shadow depth, full keyboard navigation)
  - [x] `ClayCard` (24-32px radius, dual inset bevels, outer drop shadow, elevation levels)
  - [x] `ClayInput` (sunken 3D surface, clear icon, password reveal toggle, focus ring)
  - [x] `ClayToggle` (sunken track, tactile 3D pill, spring physics)
  - [x] `ClayModal` (clay backdrop, popping 3D dialog, focus trap, ESC key dismiss)
- [x] Implement interactive Component Showcase & theme preview (Light & Dark clay modes)
- [x] Automated verification: TypeScript type-check and Vite production build

---

### Phase 2: Authentication & Secure Configuration
- [x] Master password creation and verification with Argon2id and cryptographically secure random salt
- [x] Password strength meter (entropy, complexity, visual clay feedback)
- [x] One-time 24-character recovery key generation, one-time reveal, and hash storage
- [x] DPAPI-protected AES-256-GCM encrypted configuration storage in `%APPDATA%\ClayLock\config.enc`
- [x] Typed Tauri commands for onboarding, auth status, unlock validation, and password changes
- [x] Unit tests and test suite for auth, config, and lockout backoff logic

---

### Phase 3: Application Discovery & Dashboard
- [x] App discovery engine:
  - [x] Scan Start Menu shortcuts (`%ProgramData%\Microsoft\Windows\Start Menu\Programs` & `%AppData%`)
  - [x] Scan Windows Registry Uninstall keys (`HKLM` and `HKCU` `Software\Microsoft\Windows\CurrentVersion\Uninstall`)
  - [x] Extract display names, full executable paths, and file icons
  - [x] Native file picker dialog to browse and select any `.exe`
- [x] Dashboard view:
  - [x] Claymorphic responsive grid of detected and protected applications
  - [x] App icon, title, path tooltip, and quick lock/unlock toggle
  - [x] Search and filter applications
  - [x] "Add App" clay modal with searchable list and browse button

---

### Phase 4: Process Watcher, Process Control & Unlock Overlay
- [x] Rust process watcher:
  - [x] WMI event sink subscribing to `Win32_ProcessStartTrace` events
  - [x] Fallback polling loop (300 ms `CreateToolhelp32Snapshot`)
  - [x] Case-insensitive normalization and full executable path matching
- [x] Process control engine:
  - [x] Immediate suspension via native Windows NT API (`NtSuspendProcess`)
  - [x] Window hiding via `ShowWindowAsync(hwnd, SW_HIDE)`
  - [x] Process termination on cancellation or 3 failed unlock attempts (`TerminateProcess`)
  - [x] Process resumption (`NtResumeProcess`) and window restoration on successful unlock
- [x] Unlock overlay window:
  - [x] Dedicated full-screen, always-on-top, borderless Tauri window
  - [x] App icon, title, masked password input
  - [x] Shake animation on incorrect password attempt
  - [x] Attempts remaining counter

---

### Phase 5: System Tray, Autostart, Single Instance & Grace Period
- [x] System tray integration:
  - [x] Custom tray icon with clay styling
  - [x] Tray menu (Open Quick Lock, Lock All, Activity Log, Settings, Exit)
  - [x] Minimize to tray on close
- [x] Single instance mutex (`CreateMutexW` / `tauri-plugin-single-instance`)
- [x] Windows autostart configuration via Registry `Run` key
- [x] Configurable session grace period (0 / 1 / 5 / 15 minutes) tracking
- [x] Activity log screen:
  - [x] Persistent timestamped event journal (app launched, unlocked, failed, locked out)
  - [x] Export log option

---

### Phase 6: Hardening, Lockout Backoff & Security Enforcement
- [x] Hardcoded system process denylist:
  - [x] Never lock `explorer.exe`, `winlogon.exe`, `csrss.exe`, `lsass.exe`, `svchost.exe`, `dwm.exe`, `services.exe`, `smss.exe`, or ClayLock itself
- [x] Exponential lockout backoff:
  - [x] 3 consecutive failures trigger a 30-second lockout
  - [x] Doubling lockout duration on repeated consecutive failures
- [x] Master password challenge enforcement on all critical operations:
  - [x] Unlocking protected applications requires Master Password challenge
  - [x] Removing protected applications requires Master Password challenge
  - [x] Unlocking folders (restoring NTFS ACL) requires Master Password challenge
  - [x] Removing protected folders requires Master Password challenge
- [x] Real-time Activity Log event synchronization:
  - [x] Event logging in both Rust backend (`activity_log::append_event`) and frontend live bridge
  - [x] Live timeline in Activity Log tab with filters, stats, and export
- [x] Comprehensive unit tests:
  - [x] Argon2id verification
  - [x] Config encryption/decryption round-trip
  - [x] Executable path normalization and matching

---

### Phase 7: Packaging, Custom Brand Assets & Release Configuration
- [x] Authentic 3D Claymorphic brand icons generation:
  - [x] High-res 512x512 master `icon.png`
  - [x] Multi-resolution Windows `icon.ico` (16, 24, 32, 48, 64, 128, 256 px)
  - [x] Standard Windows Store / Appx square logo package assets (30, 44, 71, 89, 107, 142, 150, 284, 310 px)
- [x] Tauri 2 NSIS installer & bundle configuration:
  - [x] Configured `tauri.conf.json` with installer icon, header images, and installation options
- [x] Native binary compilation:
  - [x] Successfully compiled `quick-lock.exe` (244 MB) with brand assets and security challenges

