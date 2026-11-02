//! Phase 6 end-to-end test: lock and unlock a real `notepad.exe`.
//!
//! Drives the same pipeline the app uses at runtime — background watcher ->
//! NtSuspendProcess + SW_HIDE -> unlock session -> NtResumeProcess + SW_SHOW ->
//! TerminateProcess — and checks real thread suspend counts at each step.
//!
//! It launches a GUI process, so it is ignored by default. Run with:
//!   scripts/cargo_e2e.ps1
//! or
//!   cargo test --test e2e_notepad -- --ignored --nocapture

#![cfg(windows)]

use quick_lock_lib::process_control;
use quick_lock_lib::watcher::{self, InterceptedApp, SessionTracker};
use std::collections::HashSet;
use std::process::Command;
use std::sync::{mpsc, Arc, Mutex};
use std::time::{Duration, Instant};
use windows::Win32::Foundation::{CloseHandle, FALSE};
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Thread32First, Thread32Next, TH32CS_SNAPTHREAD, THREADENTRY32,
};
use windows::Win32::System::Threading::{
    OpenThread, ResumeThread, SuspendThread, THREAD_SUSPEND_RESUME,
};

const NOTEPAD: &str = "notepad.exe";

fn notepad_pids() -> HashSet<u32> {
    watcher::get_current_process_map()
        .into_iter()
        .filter(|(_, name)| name.eq_ignore_ascii_case(NOTEPAD))
        .map(|(pid, _)| pid)
        .collect()
}

/// Waits for a notepad.exe PID that is not in `before` and is still alive.
/// On Windows 11 `System32\notepad.exe` is a stub that relaunches the packaged
/// Notepad under a new PID, so the spawned child's PID cannot be trusted.
fn wait_for_new_notepad(before: &HashSet<u32>, timeout: Duration) -> Option<u32> {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        if let Some(&pid) = notepad_pids().difference(before).next() {
            if process_control::get_process_executable_path(pid).is_some() {
                return Some(pid);
            }
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    None
}

fn wait_for_exit(pid: u32, timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        if !watcher::get_current_process_pids().contains(&pid) {
            return true;
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    false
}

/// Returns `true` when every thread of `pid` has a suspend count of at least 1.
/// Probes each thread with SuspendThread (which returns the previous count) and
/// immediately undoes it with ResumeThread, leaving the process state unchanged.
fn is_fully_suspended(pid: u32) -> bool {
    let mut counts = Vec::new();

    unsafe {
        let Ok(snapshot) = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0) else {
            return false;
        };
        let mut entry: THREADENTRY32 = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<THREADENTRY32>() as u32;

        if Thread32First(snapshot, &mut entry).is_ok() {
            loop {
                if entry.th32OwnerProcessID == pid {
                    if let Ok(thread) = OpenThread(THREAD_SUSPEND_RESUME, FALSE, entry.th32ThreadID) {
                        let previous = SuspendThread(thread);
                        if previous != u32::MAX {
                            ResumeThread(thread);
                            counts.push(previous);
                        }
                        let _ = CloseHandle(thread);
                    }
                }
                if Thread32Next(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snapshot);
    }

    !counts.is_empty() && counts.iter().all(|&c| c >= 1)
}

fn launch_notepad() {
    // The child may be the Windows 11 stub that exits immediately; ignore it.
    let _ = Command::new(NOTEPAD).spawn().expect("Failed to spawn notepad.exe");
}

#[test]
#[ignore = "launches a real notepad.exe window; run with --ignored"]
fn e2e_lock_and_unlock_notepad() {
    if !notepad_pids().is_empty() {
        // Windows 11 Notepad reuses a running instance (new tab, no new PID),
        // and we must never suspend a Notepad the user is working in.
        eprintln!("SKIPPED: close all Notepad windows before running this test.");
        return;
    }

    // 1. Resolve the real Notepad executable path on this machine.
    let before = notepad_pids();
    launch_notepad();
    let probe_pid = wait_for_new_notepad(&before, Duration::from_secs(10))
        .expect("Notepad did not start within 10s");
    let notepad_path = process_control::get_process_executable_path(probe_pid)
        .expect("Could not query Notepad executable path");
    println!("Resolved Notepad path: {}", notepad_path);
    process_control::terminate_process(probe_pid).expect("Failed to close probe Notepad");
    assert!(wait_for_exit(probe_pid, Duration::from_secs(5)), "Probe Notepad did not exit");

    // 2. Start the watcher with Notepad as the only locked app.
    let sessions = Arc::new(Mutex::new(SessionTracker::new()));
    let (tx, rx) = mpsc::channel::<InterceptedApp>();
    let tx = Mutex::new(tx);
    let locked_path = notepad_path.clone();

    watcher::start_watcher_loop(
        Arc::new(move || vec![("Notepad".to_string(), locked_path.clone())]),
        Arc::new(|| 0),
        move |intercepted| {
            let _ = tx.lock().unwrap().send(intercepted);
        },
        Arc::clone(&sessions),
    );
    // Let the watcher take its baseline snapshot before launching.
    std::thread::sleep(Duration::from_millis(500));

    // 3. Launch Notepad and expect it to be intercepted and suspended.
    launch_notepad();
    let intercepted = rx
        .recv_timeout(Duration::from_secs(10))
        .expect("Watcher did not intercept Notepad within 10s");
    let pid = intercepted.pid;
    println!("Intercepted '{}' PID {} at {}", intercepted.name, pid, intercepted.executable_path);

    let cleanup = |pid: u32| {
        let _ = process_control::resume_process(pid);
        let _ = process_control::terminate_process(pid);
    };

    if !watcher::normalize_path(&intercepted.executable_path).eq(&watcher::normalize_path(&notepad_path))
        || !is_fully_suspended(pid)
    {
        cleanup(pid);
        panic!("Intercepted Notepad was not matched by path and fully suspended");
    }
    println!("Verified: all threads of PID {} are suspended", pid);

    // 4. Unlock exactly as `unlock_intercepted_app` does.
    process_control::resume_process(pid).expect("NtResumeProcess failed");
    process_control::show_process_windows(pid);
    sessions.lock().unwrap().unlock_session(pid, 0);

    if is_fully_suspended(pid) {
        cleanup(pid);
        panic!("Notepad is still suspended after unlock");
    }
    assert!(sessions.lock().unwrap().is_unlocked(pid));
    println!("Verified: PID {} resumed and has an active unlock session", pid);

    // 5. Kill path (cancel / 3 failed attempts) terminates the process.
    process_control::terminate_process(pid).expect("TerminateProcess failed");
    assert!(wait_for_exit(pid, Duration::from_secs(5)), "Notepad did not exit after terminate");
    println!("Verified: PID {} terminated", pid);
}
