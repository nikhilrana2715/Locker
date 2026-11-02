# CLAUDE.md — Quick Lock (ClayLock)

> **This file is the single source of truth for any AI session working on this repository.**
> Read it **first**, in full, at the start of every new session. Then read `PLAN.md` (the
> 7-phase roadmap) and `PROGRESS.md` (the historical build log) for extra context.
> At the end of every session, append what you did to the [Session Task Log](#11-session-task-log)
> at the bottom of this file. See [Session Protocol](#10-session-protocol) for the exact rules.

---

## 1. What This Project Is

**Quick Lock** (internal codename **ClayLock**) is a Windows 10/11 desktop security
application. It behaves like a phone-style "app lock" for a PC:

- The user sets a **master password** once, during onboarding.
- The user marks any installed desktop application as **protected** ("locked").
- A background watcher thread detects when a protected application is launched,
  **suspends the process before the user can interact with it**, hides its windows,
  and shows a full-screen unlock overlay demanding the master password.
- Correct password → process is resumed and its windows restored.
  Cancel / repeated failure → process is terminated.
- Folders and individual files can also be protected, by applying a restrictive
  NTFS Deny ACL so Windows Explorer itself refuses access.

Everything is enforced natively via Windows APIs (`NtSuspendProcess`, `NtResumeProcess`,
`TerminateProcess`, `ShowWindowAsync`, `CryptProtectData`, registry reads, `icacls`).
Nothing is simulated in the shipped binary.

The user interface is a **Claymorphism** design system — soft pastel surfaces, large
24–32 px corner radii, dual inset bevel shadows, and spring-physics press animations.

**Platform:** Windows only. Non-Windows targets compile (with `#[cfg(not(windows))]`
stubs and a XOR mock in place of DPAPI) purely so the test suite can run elsewhere.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell / runtime | Tauri 2.1.1 |
| Backend | Rust 2021 edition, package `quick-lock`, lib `quick_lock_lib` |
| Frontend | React 18.3 + TypeScript 5.6 |
| Build (frontend) | Vite 5.4, fixed port **1420** |
| Styling | Tailwind CSS 3.4 + custom clay design tokens |
| Animation | Framer Motion 11 |
| Icons | lucide-react |
| Password hashing | `argon2` 0.5 (Argon2id) |
| Symmetric encryption | `aes-gcm` 0.10 (AES-256-GCM) |
| OS key protection | Windows DPAPI via `windows` crate 0.58 |
| Installer | Tauri NSIS bundle, `installMode: currentUser` |

---

## 3. Repository Layout

```
E:\Locker\
├── CLAUDE.md                    <- this file (AI session contract + architecture)
├── PLAN.md                      <- original 7-phase implementation roadmap
├── PROGRESS.md                  <- historical build log, phase completion notes
├── index.html                   <- Vite HTML entry
├── package.json                 <- frontend deps + scripts (dev / build / preview)
├── vite.config.ts               <- Vite config + DEV-ONLY system scanner API plugin
├── tailwind.config.ts           <- clay colour palette, shadows, radii, keyframes
├── tsconfig.json                <- strict TS config, "@/*" -> "./src/*" path alias
├── postcss.config.js
├── generate_icons.py            <- Python brand-icon generator (3D clay shield)
├── QuickLock.exe                <- built release binary (committed artifact)
├── QuickLock-Setup.exe          <- built NSIS installer (committed artifact)
├── debug_out.txt                <- captured debug session output (historical)
│
├── src/                         <- React + TypeScript frontend
│   ├── main.tsx                 <- React root mount
│   ├── App.tsx                  <- top-level router: overlay vs onboarding vs dashboard
│   ├── index.css                <- Tailwind layers + clay base styles
│   ├── types/index.ts           <- shared TS interfaces (see section 6)
│   ├── tokens/clay.tokens.ts    <- design tokens (colours, radii, shadow recipes)
│   ├── services/tauriBridge.ts  <- typed IPC wrapper + stateful browser mock engine
│   ├── server/systemScanner.ts  <- Node-side Windows app scanner (dev server only)
│   └── components/
│       ├── ui/                  <- Clay design-system primitives
│       │   ├── ClayButton.tsx   ClayCard.tsx   ClayInput.tsx
│       │   ├── ClayModal.tsx    ClayToggle.tsx
│       │   └── AppIcon.tsx      FolderIcon.tsx   index.ts
│       ├── auth/
│       │   ├── OnboardingScreen.tsx        <- first-run master password creation
│       │   ├── PasswordStrengthMeter.tsx   <- entropy / complexity feedback
│       │   ├── RecoveryModal.tsx           <- recovery-key password reset
│       │   └── UnlockChallengeModal.tsx    <- reusable master-password challenge
│       ├── dashboard/
│       │   ├── Dashboard.tsx        <- tab shell + state orchestration (largest file)
│       │   ├── AppGrid.tsx          <- discovered/protected app cards + lock switch
│       │   ├── AddAppModal.tsx      <- searchable installed-app picker + browse
│       │   ├── FolderGrid.tsx       <- protected folder cards
│       │   ├── AddFolderModal.tsx   <- folder/file picker
│       │   ├── SettingsTab.tsx      <- grace period, autostart, theme, password change
│       │   └── ActivityLogTab.tsx   <- event timeline, filters, stats, export
│       ├── overlay/
│       │   └── ProcessUnlockOverlay.tsx    <- the lock screen (shake on wrong password)
│       └── showcase/
│           └── ComponentShowcase.tsx       <- live clay component gallery / theme preview
│
├── src-tauri/                   <- Rust backend
│   ├── Cargo.toml               <- deps + aggressive release profile (lto, opt-level "z")
│   ├── Cargo.lock
│   ├── build.rs                 <- tauri-build + embed-resource (Windows manifest)
│   ├── tauri.conf.json          <- windows, bundle, NSIS, identifier com.quicklock.claylock
│   ├── installerHooks.nsi       <- NSIS install/uninstall hooks
│   ├── icons/                   <- icon.ico, icon.png, all Square*Logo.png store assets
│   ├── windows/                 <- test-manifest.rc / .xml
│   ├── gen/schemas/             <- Tauri-generated capability & ACL schemas
│   ├── examples/verify_real.rs  <- standalone native-behaviour verification binary
│   ├── tests/
│   │   ├── auth_tests.rs        <- Argon2id, config crypto round-trip, path matching
│   │   └── e2e_notepad.rs       <- end-to-end suspend/resume against notepad.exe
│   └── src/
│       ├── main.rs              <- single-instance mutex guard, then calls lib::run()
│       ├── lib.rs               <- AppState, all 29 #[tauri::command]s, Builder setup
│       ├── auth/mod.rs          <- Argon2id hashing, recovery key generation/verify
│       ├── config/mod.rs        <- AppConfig schema, DPAPI+AES persistence, lockout, autostart
│       ├── app_discovery/mod.rs <- registry + Start Menu scanning, native file dialogs
│       ├── watcher/mod.rs       <- background process watcher loop, SessionTracker
│       ├── process_control/mod.rs <- suspend/resume/terminate, window hide/show, denylist
│       ├── folder_lock/mod.rs   <- NTFS Deny-ACL lock/unlock via icacls, folder denylist
│       ├── activity_log/mod.rs  <- JSON event journal, read/export
│       └── tray/mod.rs          <- tray icon, menu (Open / Lock All Now / Exit)
│
└── scripts/                     <- PowerShell + Python dev helpers
    ├── cargo_build.ps1  cargo_check.ps1  cargo_test.ps1  cargo_e2e.ps1
    ├── run_verify_real.ps1  run_verify_direct.ps1  test_root_example.ps1
    ├── test_run_native.ps1  test_runner_error.ps1  debug_test_exe.ps1
    ├── check_quick_lock.ps1  check_event_log.ps1  check_system_events.ps1
    ├── generate_icons.js
    └── compare_imports.py  find_missing_symbol.py
```

---

## 4. Rust Backend Architecture

### 4.1 Startup sequence

1. **`main.rs`** creates a named mutex `Local\ClayLock_SingleInstance_Mutex_v1` via
   `CreateMutexW`. If it already exists, the process exits immediately — only one
   instance may ever run.
2. **`lib.rs::run()`**:
   - Loads and decrypts `%APPDATA%\ClayLock\config.enc`, falling back to
     `AppConfig::default()` on first run or decryption failure.
   - Wraps shared state in `Arc<Mutex<...>>` and builds `AppState`
     (`config`, `intercepted_process`, `session_tracker`).
   - `tauri::Builder` -> `.plugin(tauri_plugin_shell::init())` -> `.setup(...)`:
     1. Installs the system tray (`tray::setup_tray`).
     2. Hooks `CloseRequested` on the `main` window -> `prevent_close()` + `hide()`
        (minimise to tray instead of quitting). Honours a `--minimized` argv flag
        used by Windows autostart.
     3. Hooks `CloseRequested` on the `unlock-overlay` window -> terminates the
        currently intercepted process, then hides the overlay.
     4. Spawns the background watcher thread (`watcher::start_watcher_loop`).
   - Registers all 29 IPC commands and runs.

### 4.2 Two windows (declared in `tauri.conf.json`)

| Label | Purpose | Notable flags |
|-------|---------|---------------|
| `main` | Dashboard / onboarding | 980x720, min 760x580, decorated, centred |
| `unlock-overlay` | Lock screen | `index.html?window=unlock`, 460x400, `alwaysOnTop`, undecorated, transparent, starts hidden |

`App.tsx` detects which window it is running in via the `?window=unlock` query param
or `getCurrentWebviewWindow().label === "unlock-overlay"`, and renders only
`ProcessUnlockOverlay` in the overlay window.

### 4.3 Process watcher (`watcher/mod.rs`)

A single detached `std::thread` runs an infinite loop:

- **Adaptive sleep** — 1500 ms when nothing is locked, 250 ms when at least one app
  is locked. This keeps idle CPU usage effectively zero.
- Snapshots all running processes (`CreateToolhelp32Snapshot`) into a
  `HashMap<u32 /*pid*/, String /*exe name*/>`.
- Prunes dead PIDs from `SessionTracker`.
- For each **newly appeared** PID (not in the previous snapshot):
  1. Skip if the executable name is on `SYSTEM_DENYLIST`.
  2. **Zero-syscall name filter** — compare only the in-memory exe filename against
     the target filenames of locked apps. Non-matches are discarded without a single
     `OpenProcess` call.
  3. Skip if the PID is inside an active unlock grace session.
  4. Only now resolve the full image path (`get_process_executable_path`), re-check
     the denylist against the full path, and confirm the match with
     `matches_target_app` (normalised full path OR filename equality).
  5. On a confirmed match: `suspend_process(pid)` -> `hide_process_windows(pid)` ->
     invoke the `on_intercept` callback.
- `on_intercept` (wired in `lib.rs`) stores the `InterceptedApp` in shared state,
  shows and force-foregrounds the overlay window, and emits the `app_intercepted`
  event to both the overlay and the app handle.

`SessionTracker` holds `active_unlocked_pids: HashMap<u32, u64 /*expiry epoch secs*/>`.
A grace period of `0` means the unlock applies to that PID for its whole lifetime;
otherwise the entry expires after `grace_period_minutes * 60` seconds.

### 4.4 Process control (`process_control/mod.rs`)

- `NtSuspendProcess` / `NtResumeProcess` are resolved dynamically from `ntdll.dll`
  at call time, because they are undocumented and have no import library.
- `hide_process_windows` / `show_process_windows` enumerate top-level windows,
  filter by owning PID, and call `ShowWindowAsync(hwnd, SW_HIDE | SW_SHOW)`.
- `terminate_process` uses `TerminateProcess`.
- **`SYSTEM_DENYLIST`** (never suspendable — a hard safety guarantee):
  `explorer.exe`, `winlogon.exe`, `csrss.exe`, `lsass.exe`, `svchost.exe`,
  `dwm.exe`, `services.exe`, `smss.exe`, `spoolsv.exe`, `taskhostw.exe`,
  `sihost.exe`, `runtimebroker.exe`, plus ClayLock's own binaries
  (`quick-lock.exe`, `quicklock.exe`, `claylock.exe`, `quicklock-setup.exe`).

### 4.5 Configuration persistence (`config/mod.rs`)

Path: **`%APPDATA%\ClayLock\config.enc`** (falls back to `%USERPROFILE%`).

Encryption envelope on every save:

1. Serialise `AppConfig` to JSON.
2. Generate a fresh random 32-byte AES-256 key (`OsRng`).
3. Encrypt the JSON with AES-256-GCM using a fresh random nonce.
4. Wrap the AES key with Windows **DPAPI** (`CryptProtectData`,
   `CRYPTPROTECT_UI_FORBIDDEN`) so it is bound to the current Windows user account.
5. Write the DPAPI-wrapped key, the nonce, and the ciphertext to disk.

On non-Windows builds the DPAPI layer is replaced by a plain XOR-`0x5C` mock —
**test-only, never a security boundary**.

`AppConfig` fields: `master_password_hash`, `recovery_key_hash`, `is_onboarded`,
`grace_period_minutes`, `start_with_windows`, `theme`, `failed_attempts`,
`locked_until_timestamp`, `current_lockout_duration_secs`, `protected_apps`,
`protected_folders`.

**Lockout backoff:** 3 consecutive wrong passwords -> 30 s lockout. Each further
consecutive failure streak **doubles** `current_lockout_duration_secs`. A successful
verification resets both the counter and the duration.

**Autostart:** `is_autostart_enabled()` / `set_autostart(bool)` write the
`HKCU\Software\Microsoft\Windows\CurrentVersion\Run` registry value, with the
`--minimized` flag appended so the app starts hidden in the tray.

### 4.6 Authentication (`auth/mod.rs`)

- `hash_password` / `verify_password` — Argon2id with a cryptographically random salt,
  stored as a PHC string.
- `generate_recovery_key` — returns `(raw_key, hash)`. The 24-character raw key is
  shown to the user **exactly once** during onboarding; only the hash is persisted.
- `verify_recovery_key` — used by `recover_with_key` to reset a forgotten master
  password.

### 4.7 Application discovery (`app_discovery/mod.rs`)

Scans, de-duplicating by normalised executable path:

- `HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall`
- `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall`
- `App Paths` registry keys
- Start Menu shortcut directories (`%ProgramData%\...\Start Menu\Programs` and the
  per-user `%AppData%` equivalent)

Helpers: `expand_env_vars`, `sanitize_exe_path`, `derive_app_name`, and
`is_junk_app` (filters installers, uninstallers, updaters, and background utilities
so the dashboard only shows real user-facing applications).

Native dialogs: `pick_executable_dialog`, `pick_file_dialog`, `pick_folder_dialog`.

### 4.8 Folder / file locking (`folder_lock/mod.rs`)

- **Lock:** `icacls <path> /deny *S-1-1-0:(OI)(CI)(F)` for directories,
  `/deny *S-1-1-0:F` for single files. `S-1-1-0` is the *Everyone* SID.
- **Unlock:** `icacls <path> /remove:d *S-1-1-0`.
- `SYSTEM_FOLDER_DENYLIST` + `is_system_folder()` refuse to lock Windows system
  directories, drive roots, or anything containing `claylock` (self-protection).
- `open_path_in_os` shells out to open a protected item after a successful unlock.

### 4.9 Activity log (`activity_log/mod.rs`)

Append-only timestamped journal in the ClayLock app-data directory.
`EventKind` variants cover: app added/removed/intercepted/unlocked, folder
added/removed/locked/unlocked, failed attempts, lockouts, and "Lock All".
API: `append_event`, `get_events(limit)`, `export_log(destination)`,
`log_file_path_string`.

---

## 5. IPC Command Surface (29 commands)

All are `#[tauri::command]` functions in `src-tauri/src/lib.rs`, registered in a
single `tauri::generate_handler!` block, and wrapped with typed helpers in
`src/services/tauriBridge.ts`.

**Auth**
`get_auth_state` · `setup_onboarding` · `verify_master_password` ·
`recover_with_key` · `change_password`

**Protected apps**
`get_protected_apps` · `add_protected_app` · `toggle_app_lock` · `remove_protected_app`

**Protected folders**
`get_protected_folders` · `add_protected_folder` · `toggle_folder_lock` ·
`remove_protected_folder`

**Discovery & pickers**
`scan_installed_apps` · `pick_executable` · `pick_file` · `pick_folder` ·
`open_protected_item` · `restore_window_after_unlock`

**Interception**
`get_intercepted_app` · `unlock_intercepted_app` · `cancel_intercepted_app` ·
`simulate_intercept_app`

**Settings, tray & log**
`get_app_settings` · `update_app_settings` · `lock_all_items` ·
`get_activity_log` · `export_activity_log` · `get_log_file_path`

**Events emitted backend -> frontend:** `app_intercepted`, `tray_lock_all`.

**Master-password challenge is mandatory** before: disabling an app's lock,
removing a protected app, unlocking a folder, and removing a protected folder.

---

## 6. Frontend Architecture

### 6.1 Render decision tree (`App.tsx`)

```
is this the unlock-overlay window?      -> ProcessUnlockOverlay (standalone)
isOnboarded === null                    -> clay spinner (loading auth state)
isOnboarded === false                   -> OnboardingScreen
interceptedApp !== null                 -> ProcessUnlockOverlay (in-window)
otherwise                               -> Dashboard
```

`App.tsx` also listens for the `app_intercepted` and `tray_lock_all` Tauri events
**and** polls `get_intercepted_app` every 300 ms, plus on `focus` and
`visibilitychange`. The poll is deliberate redundancy: it guarantees the lock screen
appears even if the window was hidden when the event fired.

### 6.2 `tauriBridge.ts` — the critical abstraction

`isTauri()` checks for `__TAURI_INTERNALS__` on `window`.

- **Inside Tauri:** every method forwards to the real Rust command via `invoke`.
- **In a plain browser** (`npm run dev` opened directly at `localhost:1420`):
  a **stateful mock engine** backed by `localStorage` under the key
  `claylock_system_state_v4` takes over, so the full UI is explorable without
  compiling Rust. Older mock keys (`..._v3`, `..._v2`) are purged on load.

> **Historical note / known trap:** earlier versions of the mock pre-seeded five
> fake applications with `C:\Users\User\...` paths, which made the dev build look
> like a prototype. That was removed. In dev the app now gets **real** installed
> applications from the Vite middleware API (below). Do not reintroduce hardcoded
> sample apps.

### 6.3 Dev-only system scanner API (`vite.config.ts` + `src/server/systemScanner.ts`)

`systemScannerPlugin()` registers three Vite dev-server middleware endpoints:

| Endpoint | Behaviour |
|----------|-----------|
| `/api/system-apps` | `scanWindowsApplications()` — Node-side registry + Start Menu scan |
| `/api/pick-folder` | Spawns a PowerShell `FolderBrowserDialog` |
| `/api/pick-executable` | Spawns a PowerShell `OpenFileDialog` (`*.exe`) |

These exist **only in the Vite dev server**. They are absent from the production
bundle, where the equivalent Rust commands are used instead. The PowerShell calls
are `execSync` with `-NoProfile -NonInteractive -STA`.

### 6.4 Shared TypeScript types (`src/types/index.ts`)

`ProtectedApp` · `ProtectedFolder` · `InterceptedApp` · `ProtectedItemType`
(`"apps" | "folders" | "settings" | "activity" | "showcase"`) ·
`GracePeriodMinutes` (`0 | 1 | 5 | 15`) · `AppSettings` · `ActivityLogEntry` ·
`AuthState` · `DiscoveredApp`.

> **Naming convention:** Rust uses `snake_case` fields; the frontend expects
> `camelCase`. `tauriBridge.ts` is responsible for mapping between them, and some
> components defensively accept both spellings (e.g.
> `payload.executablePath || payload.executable_path`). Keep that mapping in the
> bridge — do not scatter conversions through components.

### 6.5 Clay design system

`src/tokens/clay.tokens.ts` holds the canonical colours, radii, and shadow recipes;
`tailwind.config.ts` mirrors them as Tailwind theme extensions. Every surface uses
**two** inset shadows (a light top-left bevel and a dark bottom-right bevel) plus an
outer drop shadow. Light and dark clay modes are both supported.
`ComponentShowcase.tsx` is the living gallery — check any new primitive renders
correctly there in both themes.

---

## 7. Development Commands

```bash
# Frontend only (browser preview at http://localhost:1420, mock/dev-API mode)
npm run dev

# Type-check + production frontend build
npm run build          # == tsc && vite build

# Preview the built frontend
npm run preview

# Full native app in dev mode (requires Rust toolchain)
npx tauri dev

# Build the native binary + NSIS installer
npx tauri build
```

```powershell
# Rust helpers (from repo root; these wrap cargo with the right cwd)
.\scripts\cargo_check.ps1      # cargo check
.\scripts\cargo_build.ps1      # cargo build
.\scripts\cargo_test.ps1       # cargo test (auth_tests.rs)
.\scripts\cargo_e2e.ps1        # end-to-end notepad suspend/resume test
.\scripts\run_verify_real.ps1  # runs examples/verify_real.rs
```

**Verification bar before declaring any change done:**
`npx tsc --noEmit` -> 0 errors, `npm run build` -> 0 errors, `cargo build` -> 0 errors.

**Brand icons:** `python generate_icons.py` (or `node scripts/generate_icons.js`)
regenerates the 512x512 master `icon.png`, the multi-resolution `icon.ico`
(16/24/32/48/64/128/256), and all `Square*Logo.png` store assets.

---

## 8. Security Model & Invariants

Treat these as non-negotiable. Breaking one is a security regression, not a bug.

1. **Plaintext passwords are never persisted.** Only an Argon2id PHC hash is stored.
2. **The recovery key is revealed exactly once**, at onboarding. Only its hash is saved.
3. **Config is always double-protected**: AES-256-GCM for the payload, DPAPI for the
   key. Never write `AppConfig` to disk unencrypted, and never log its contents.
4. **`SYSTEM_DENYLIST` is checked twice** per candidate process — once on the
   in-memory executable name, once on the resolved full path. Never bypass either.
5. **ClayLock cannot lock itself.** Its own binaries are denylisted, and
   `is_system_folder()` rejects any path containing `claylock`.
6. **Every privilege-reducing action requires a fresh master-password challenge**
   (unlocking an app, removing an app, unlocking a folder, removing a folder).
7. **Lockout backoff must escalate.** 3 failures -> 30 s, doubling on each repeated
   failure streak.
8. **Folder locks must be reversible.** Every `icacls /deny` has a matching
   `/remove:d` path, and removing a protected folder unlocks it first.
9. The non-Windows XOR mock in `config/mod.rs` is a test shim only. Never ship or
   rely on it as protection.

---

## 9. Known Issues & Code/Doc Discrepancies

Verified against the source on 2026-11-02. `PLAN.md` and `PROGRESS.md` are
aspirational in places; **the code below is what actually runs.**

1. **No WMI event sink.** `PLAN.md` Phase 4 claims a `Win32_ProcessStartTrace` WMI
   subscription with polling as a fallback. In reality `watcher/mod.rs` uses
   **only** the adaptive polling loop (250 ms / 1500 ms) over
   `CreateToolhelp32Snapshot`. The `wmi = "0.14"` dependency in `Cargo.toml` is
   **unused** — either implement the sink or drop the dependency.
2. **No `tauri-plugin-single-instance`.** Single-instance behaviour is hand-rolled
   in `main.rs` with `CreateMutexW`. Note the mutex name is
   `Local\ClayLock_SingleInstance_Mutex_v1`, while `PROGRESS.md` documents it as
   `Global\...`. The code is `Local\` (per-session scope).
3. **Tray menu is 3 items, not 5.** `tray/mod.rs` has *Open Quick Lock*,
   *Lock All Now*, *Exit Quick Lock*. `PLAN.md` also lists *Activity Log* and
   *Settings* entries, which do not exist.
4. **`PROGRESS.md` references stale paths.** It cites a 244 MB debug binary at
   `N:\Locker\...`; this repository lives at `E:\Locker` and the committed release
   binary `QuickLock.exe` is ~4.4 MB (the release profile uses
   `opt-level = "z"`, `lto = true`, `strip = true`).
5. **`config/mod.rs` contains a pointless indirection**: `mod boolean_type { pub type
   Bool = bool; }`, used as `ProtectedAppItem::is_locked: boolean_type::Bool`.
   Harmless, but it should just be `bool`.
6. **Dev-mode polling is aggressive.** `App.tsx` polls `get_intercepted_app` every
   300 ms unconditionally. Intentional (guarantees the lock screen appears), but it
   is the first thing to look at for idle-CPU complaints in the webview.
7. **`QuickLock.exe` / `QuickLock-Setup.exe` are committed build artifacts.** They
   will go stale relative to the source. Rebuild them before any release and commit
   the refreshed binaries, or move them to GitHub Releases.

---

## 10. Session Protocol

**Follow this on every new session in this repository.**

### At session start
1. Read **this entire file** (`CLAUDE.md`) before touching any code.
2. Skim the [Session Task Log](#11-session-task-log) bottom-up — the most recent
   entries describe where work stopped and what is in flight.
3. Read `PLAN.md` / `PROGRESS.md` only for extra background, and remember section 9:
   where they conflict with the code, **the code wins**.
4. Do not re-derive the architecture from scratch; sections 3-6 above are current.

### While working
- Keep the Rust / TypeScript boundary clean: new backend capability means a new
  `#[tauri::command]`, registration in `generate_handler!`, a typed wrapper in
  `tauriBridge.ts`, a mock path for browser dev mode, and a type in
  `src/types/index.ts`.
- Respect the section 8 security invariants.
- Reuse Clay primitives from `src/components/ui/` — do not hand-roll shadows.
- Verify before claiming completion: `npx tsc --noEmit`, `npm run build`,
  `cargo build`, and `cargo test` where logic changed.

### At session end — **mandatory**
Append one entry to section 11 using the template below. Newest entries go at the
bottom. Keep it factual: what changed, which files, how it was verified, what is
still open. If architecture, commands, types, or invariants changed, **also update
the relevant section above** so sections 3-9 never go stale.

```markdown
### YYYY-MM-DD — <short title>
- **Did:** <what was actually completed>
- **Files:** <paths touched>
- **Verified:** <commands run + results>
- **Open:** <anything left unfinished, blocked, or newly discovered>
```

---

## 11. Session Task Log

### 2026-11-02 — Repository initialised, documented and pushed to GitHub
- **Did:** Audited the full codebase (66 source files across `src/` and `src-tauri/`);
  authored this `CLAUDE.md` as the permanent AI session contract and architecture
  reference; added a `.gitignore` (excludes `node_modules/` ~334 MB, `dist/`,
  `src-tauri/target/`, local run logs); initialised git on top of the existing
  `main` branch of `github.com/nikhilrana2715/Locker` (which contained only a
  `README.md`) and pushed the entire codebase.
- **Files:** `CLAUDE.md` (new), `.gitignore` (new). No application source modified.
- **Verified:** Read every Rust module and all frontend entry points to confirm the
  documented architecture matches the implementation; cross-checked `PLAN.md` /
  `PROGRESS.md` against the source and recorded 7 real discrepancies in section 9.
- **Open:** The section 9 discrepancies are all unresolved — most notably the unused
  `wmi` dependency and the `PLAN.md` WMI-event-sink claim. No build or test command
  was run this session (documentation-only change), so the Rust/TS verification bar
  in section 7 still needs a clean run after the next code change.
