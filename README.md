# 🔒 Quick Lock

**App lock for your PC.** Protect any Windows application, folder or file behind a master password — just like the app lock on your phone.

Quick Lock (codename *ClayLock*) watches for protected applications launching, **suspends the process before you can interact with it**, hides its windows, and demands your master password. Get it right and the app resumes exactly where it was. Cancel, and the process is terminated.

Built with **Tauri 2 + Rust** for the enforcement layer and **React + TypeScript + Tailwind** for a tactile Claymorphism interface.

![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-0078D4)
![Tauri](https://img.shields.io/badge/Tauri-2.1.1-FFC131)
![Rust](https://img.shields.io/badge/Rust-2021-DE4A1F)
![React](https://img.shields.io/badge/React-18.3-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6)

---

## Why this exists

Windows has no built-in way to put a password on a single application. Anyone with access to an unlocked machine can open your browser, your chat app, your banking software or your private folders. Quick Lock closes that gap without encrypting your whole disk or creating a second user account.

Everything is enforced with native Windows APIs — `NtSuspendProcess`, `ShowWindowAsync`, `CryptProtectData`, registry reads and `icacls`. Nothing is faked in the shipped binary.

---

## Features

### 🛡️ Application locking
- Scans the Windows Registry and Start Menu to discover every installed application automatically — no typing paths.
- One-click switch to protect any app.
- A background watcher intercepts a protected app **the instant it launches**, suspends it and hides its windows before anything renders.
- Full-screen, always-on-top unlock overlay with the app's real name and icon.
- Wrong password shakes the dialog and counts down remaining attempts.

### 📁 Folder & file locking
- Lock any folder or individual file with a restrictive NTFS **Deny** ACL — Windows Explorer itself refuses access.
- Fully reversible: unlocking removes the Deny ACE and restores normal access.
- System directories, drive roots and Quick Lock's own data are refused outright.

### 🔑 Authentication
- Master password hashed with **Argon2id** and a cryptographically random salt. The plaintext is never stored.
- Live password strength meter during onboarding.
- A 24-character **recovery key**, shown exactly once, lets you reset a forgotten master password. Only its hash is kept.
- Every privilege-reducing action — unlocking an app, removing a protected app, unlocking or removing a folder — requires a fresh password challenge.

### ⏱️ Grace periods
Choose how long an unlock lasts for a given process: **0** (the whole process lifetime), **1**, **5** or **15 minutes**. Re-launching after expiry prompts again.

### 🚫 Brute-force protection
Three consecutive wrong passwords trigger a 30-second lockout, and the duration **doubles** on each further failure streak. A correct password resets it.

### 📊 Activity log
A timestamped journal of every security event — app intercepted, app unlocked, folder locked, failed attempt, lockout, "Lock All" — with filters, stats and one-click export.

### 🧰 System integration
- Lives in the system tray; closing the window minimises instead of quitting.
- Tray menu: *Open Quick Lock*, *🔒 Lock All Now*, *Exit*.
- Optional start-with-Windows, launching hidden in the tray.
- Single-instance guard — a named mutex prevents a second copy running.

### 🎨 Claymorphism UI
Soft pastel surfaces, 24–32 px radii, dual inset bevel shadows and spring-physics press animations, in both light and dark clay themes.

---

## Safety guarantees

Quick Lock will **never** suspend a critical Windows process. These are permanently denylisted and the check runs twice — once on the in-memory executable name, once on the resolved full path:

```
explorer.exe   winlogon.exe   csrss.exe       lsass.exe
svchost.exe    dwm.exe        services.exe    smss.exe
spoolsv.exe    taskhostw.exe  sihost.exe      runtimebroker.exe
```

Quick Lock also cannot lock itself — its own binaries are denylisted, and any path containing `claylock` is rejected by the folder locker.

---

## How your data is stored

Configuration lives at `%APPDATA%\ClayLock\config.enc`, written through a double-protected envelope on every save:

1. The config is serialised to JSON.
2. A fresh random 32-byte key encrypts it with **AES-256-GCM** under a fresh random nonce.
3. That AES key is wrapped with Windows **DPAPI** (`CryptProtectData`), binding it to your Windows user account.
4. The wrapped key, nonce and ciphertext are written to disk.

The file is unreadable from another Windows account, and no password or recovery key is ever stored in plaintext.

---

## Installation

Download **`QuickLock-Setup.exe`** from this repository and run it. The NSIS installer is configured for `currentUser`, so no administrator prompt is needed.

`QuickLock.exe` is the standalone built binary if you prefer to run it without installing.

> ⚠️ Folder locking shells out to `icacls`. Depending on the target path's existing permissions, applying or removing an ACL may require running Quick Lock as administrator.

---

## Build from source

**Prerequisites:** Node.js 18+, the Rust toolchain (`rustup`), and the Tauri 2 Windows prerequisites (WebView2 runtime and the MSVC build tools).

```bash
git clone https://github.com/nikhilrana2715/Locker.git
cd Locker
npm install
```

```bash
# Frontend only — browser preview at http://localhost:1420
npm run dev

# Type-check + production frontend build
npm run build

# Full native app in dev mode
npx tauri dev

# Build the release binary and the NSIS installer
npx tauri build
```

Running `npm run dev` and opening `localhost:1420` directly in a browser gives you the complete UI without compiling Rust — a `localStorage`-backed mock engine stands in for the backend, while a Vite middleware API still serves your **real** installed applications.

### Rust helpers

```powershell
.\scripts\cargo_check.ps1      # cargo check
.\scripts\cargo_build.ps1      # cargo build
.\scripts\cargo_test.ps1       # unit tests: Argon2id, config crypto round-trip, path matching
.\scripts\cargo_e2e.ps1        # end-to-end suspend/resume against notepad.exe
```

---

## How it works

```
                 ┌─────────────────────────────────────────┐
                 │   Watcher thread (Rust, background)     │
                 │   250 ms when armed · 1500 ms when idle │
                 └────────────────┬────────────────────────┘
                                  │ new PID appears
                                  ▼
          ┌───────────────────────────────────────────────┐
          │  1. System denylist check (exe name)          │
          │  2. Zero-syscall filename filter              │
          │  3. Active grace-session check                │
          │  4. Resolve full image path + re-check        │
          └────────────────┬──────────────────────────────┘
                           │ confirmed match
                           ▼
          ┌───────────────────────────────────────────────┐
          │  NtSuspendProcess(pid)                        │
          │  ShowWindowAsync(hwnd, SW_HIDE)               │
          │  emit "app_intercepted" → unlock overlay      │
          └────────────────┬──────────────────────────────┘
                           │
            ┌──────────────┴───────────────┐
            ▼                              ▼
   correct password               cancel / failures
   NtResumeProcess                TerminateProcess
   windows restored               process killed
   grace session started
```

The watcher sleeps 1500 ms when nothing is locked and 250 ms when at least one app is protected, so idle CPU cost is effectively zero. Candidate processes are rejected by in-memory filename comparison **before** any `OpenProcess` syscall is made — unrelated applications cost nothing to ignore.

---

## Project structure

```
src/                      React + TypeScript frontend
├── App.tsx               top-level router: overlay / onboarding / dashboard
├── components/
│   ├── ui/               Clay design-system primitives
│   ├── auth/             onboarding, strength meter, recovery, challenge
│   ├── dashboard/        app grid, folder grid, settings, activity log
│   └── overlay/          the unlock lock screen
├── services/             typed Tauri IPC bridge + browser mock engine
├── server/               dev-only Windows application scanner
└── tokens/               clay design tokens

src-tauri/src/            Rust backend
├── main.rs               single-instance mutex, entry point
├── lib.rs                AppState + 29 Tauri IPC commands
├── auth/                 Argon2id hashing, recovery keys
├── config/               AES-256-GCM + DPAPI persistence, lockout, autostart
├── app_discovery/        registry + Start Menu scanning, native dialogs
├── watcher/              process watcher loop, grace-period sessions
├── process_control/      suspend / resume / terminate, window hiding, denylist
├── folder_lock/          NTFS Deny-ACL locking via icacls
├── activity_log/         event journal and export
└── tray/                 system tray icon and menu
```

---

## Documentation

| File | Contents |
|------|----------|
| [`CLAUDE.md`](CLAUDE.md) | Full architecture reference — startup sequence, all 29 IPC commands, the config encryption envelope, security invariants, dev commands, and known code/doc discrepancies |
| [`PLAN.md`](PLAN.md) | The original 7-phase implementation roadmap |
| [`PROGRESS.md`](PROGRESS.md) | Historical build log and phase completion notes |

Where these documents disagree with the source, **the source wins** — section 9 of `CLAUDE.md` tracks the known divergences.

---

## Status

All seven planned phases are implemented and the application builds and runs natively on Windows. Known open items are tracked in section 9 of `CLAUDE.md`; the most notable are an unused `wmi` dependency (the watcher uses polling, not a WMI event sink) and the committed binaries drifting from source between releases.

---

## Platform support

**Windows 10 and 11 only.** Non-Windows targets compile — `#[cfg(not(windows))]` stubs and a XOR mock in place of DPAPI — purely so the Rust test suite can run elsewhere. That mock is a test shim, never a security boundary, and no locking is enforced off Windows.
