use std::path::Path;
use windows::core::s;
use windows::Win32::Foundation::{BOOL, FALSE, HANDLE, HWND, LPARAM, TRUE};
use windows::Win32::System::LibraryLoader::{GetModuleHandleA, GetProcAddress};
use windows::Win32::System::Threading::{
    OpenProcess, TerminateProcess, PROCESS_QUERY_LIMITED_INFORMATION,
    PROCESS_SUSPEND_RESUME, PROCESS_TERMINATE, QueryFullProcessImageNameW,
    PROCESS_NAME_FORMAT,
};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowThreadProcessId, ShowWindowAsync, SW_HIDE, SW_SHOW,
};

#[derive(Debug, thiserror::Error)]
pub enum ProcessControlError {
    #[error("Failed to open process handle for PID {0}")]
    OpenProcessFailed(u32),
    #[error("NtSuspendProcess failed with status code {0:#x}")]
    NtSuspendFailed(i32),
    #[error("NtResumeProcess failed with status code {0:#x}")]
    NtResumeFailed(i32),
    #[error("TerminateProcess failed for PID {0}")]
    TerminateFailed(u32),
    #[error("System API error: {0}")]
    SystemApiError(String),
}

/// Hardcoded system process denylist that must NEVER be suspended or terminated
pub const SYSTEM_DENYLIST: &[&str] = &[
    "explorer.exe",
    "winlogon.exe",
    "csrss.exe",
    "lsass.exe",
    "svchost.exe",
    "dwm.exe",
    "services.exe",
    "smss.exe",
    "spoolsv.exe",
    "taskhostw.exe",
    "sihost.exe",
    "runtimebroker.exe",
    "quick-lock.exe",
    "quicklock.exe",
    "claylock.exe",
    "quicklock-setup.exe",
];

/// Checks if a process executable name is in the critical system denylist
pub fn is_denylisted(process_name_or_path: &str) -> bool {
    let lower = process_name_or_path.to_lowercase();
    let file_name = Path::new(&lower)
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or(&lower);

    SYSTEM_DENYLIST.iter().any(|item| file_name == *item)
}

type NtSuspendProcessFn = unsafe extern "system" fn(process_handle: HANDLE) -> i32;
type NtResumeProcessFn = unsafe extern "system" fn(process_handle: HANDLE) -> i32;

/// Resolves NtSuspendProcess from ntdll.dll
fn get_nt_suspend() -> Option<NtSuspendProcessFn> {
    unsafe {
        let ntdll = GetModuleHandleA(s!("ntdll.dll")).ok()?;
        let proc = GetProcAddress(ntdll, s!("NtSuspendProcess"))?;
        Some(std::mem::transmute(proc))
    }
}

/// Resolves NtResumeProcess from ntdll.dll
fn get_nt_resume() -> Option<NtResumeProcessFn> {
    unsafe {
        let ntdll = GetModuleHandleA(s!("ntdll.dll")).ok()?;
        let proc = GetProcAddress(ntdll, s!("NtResumeProcess"))?;
        Some(std::mem::transmute(proc))
    }
}

/// Immediately suspends a target process via native NtSuspendProcess
pub fn suspend_process(pid: u32) -> Result<(), ProcessControlError> {
    #[cfg(windows)]
    {
        let nt_suspend = get_nt_suspend().ok_or_else(|| {
            ProcessControlError::SystemApiError("NtSuspendProcess not found in ntdll.dll".into())
        })?;

        unsafe {
            let handle = OpenProcess(PROCESS_SUSPEND_RESUME, FALSE, pid)
                .map_err(|_| ProcessControlError::OpenProcessFailed(pid))?;

            let status = nt_suspend(handle);
            let _ = windows::Win32::Foundation::CloseHandle(handle);

            if status >= 0 {
                Ok(())
            } else {
                Err(ProcessControlError::NtSuspendFailed(status))
            }
        }
    }

    #[cfg(not(windows))]
    {
        Ok(())
    }
}

/// Resumes a suspended process via native NtResumeProcess
pub fn resume_process(pid: u32) -> Result<(), ProcessControlError> {
    #[cfg(windows)]
    {
        let nt_resume = get_nt_resume().ok_or_else(|| {
            ProcessControlError::SystemApiError("NtResumeProcess not found in ntdll.dll".into())
        })?;

        unsafe {
            let handle = OpenProcess(PROCESS_SUSPEND_RESUME, FALSE, pid)
                .map_err(|_| ProcessControlError::OpenProcessFailed(pid))?;

            let status = nt_resume(handle);
            let _ = windows::Win32::Foundation::CloseHandle(handle);

            if status >= 0 {
                Ok(())
            } else {
                Err(ProcessControlError::NtResumeFailed(status))
            }
        }
    }

    #[cfg(not(windows))]
    {
        Ok(())
    }
}

/// Forcefully terminates a process (called on 3 wrong unlock attempts or cancellation)
pub fn terminate_process(pid: u32) -> Result<(), ProcessControlError> {
    #[cfg(windows)]
    {
        unsafe {
            let handle = OpenProcess(PROCESS_TERMINATE, FALSE, pid)
                .map_err(|_| ProcessControlError::OpenProcessFailed(pid))?;

            let res = TerminateProcess(handle, 1);
            let _ = windows::Win32::Foundation::CloseHandle(handle);

            if res.is_ok() {
                Ok(())
            } else {
                Err(ProcessControlError::TerminateFailed(pid))
            }
        }
    }

    #[cfg(not(windows))]
    {
        Ok(())
    }
}

struct WindowEnumContext {
    target_pid: u32,
    show_cmd: windows::Win32::UI::WindowsAndMessaging::SHOW_WINDOW_CMD,
}

unsafe extern "system" fn enum_window_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let ctx = &*(lparam.0 as *const WindowEnumContext);
    let mut pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, Some(&mut pid));

    if pid == ctx.target_pid {
        let _ = ShowWindowAsync(hwnd, ctx.show_cmd);
        if ctx.show_cmd == SW_SHOW {
            let _ = windows::Win32::UI::WindowsAndMessaging::BringWindowToTop(hwnd);
            let _ = windows::Win32::UI::WindowsAndMessaging::SetForegroundWindow(hwnd);
        }
    }

    TRUE
}

/// Hides all top-level windows of a process immediately
pub fn hide_process_windows(pid: u32) {
    #[cfg(windows)]
    {
        let ctx = WindowEnumContext {
            target_pid: pid,
            show_cmd: SW_HIDE,
        };
        unsafe {
            let _ = EnumWindows(
                Some(enum_window_callback),
                LPARAM(&ctx as *const _ as isize),
            );
        }
    }
}

/// Restores top-level windows of a process after successful master authentication
pub fn show_process_windows(pid: u32) {
    #[cfg(windows)]
    {
        let ctx = WindowEnumContext {
            target_pid: pid,
            show_cmd: SW_SHOW,
        };
        unsafe {
            let _ = EnumWindows(
                Some(enum_window_callback),
                LPARAM(&ctx as *const _ as isize),
            );
        }
    }
}

/// Queries full executable path of a running process
pub fn get_process_executable_path(pid: u32) -> Option<String> {
    #[cfg(windows)]
    {
        unsafe {
            let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pid).ok()?;
            let mut buffer = [0u16; 1024];
            let mut size = buffer.len() as u32;

            let success = QueryFullProcessImageNameW(
                handle,
                PROCESS_NAME_FORMAT(0),
                windows::core::PWSTR(buffer.as_mut_ptr()),
                &mut size,
            );

            let _ = windows::Win32::Foundation::CloseHandle(handle);

            if success.is_ok() && size > 0 {
                Some(String::from_utf16_lossy(&buffer[..size as usize]))
            } else {
                None
            }
        }
    }

    #[cfg(not(windows))]
    {
        None
    }
}
