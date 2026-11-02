// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Phase 6: Single Instance Mutex - Prevent multiple ClayLock instances
    #[cfg(windows)]
    {
        use std::ptr;
        use std::ffi::OsStr;
        use std::os::windows::ffi::OsStrExt;

        extern "system" {
            fn CreateMutexW(
                lp_mutex_attributes: *mut std::ffi::c_void,
                b_initial_owner: i32,
                lp_name: *const u16,
            ) -> *mut std::ffi::c_void;
            fn GetLastError() -> u32;
        }

        const ERROR_ALREADY_EXISTS: u32 = 183;

        let mutex_name: Vec<u16> = OsStr::new("Local\\ClayLock_SingleInstance_Mutex_v1")
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();

        unsafe {
            let handle = CreateMutexW(ptr::null_mut(), 1, mutex_name.as_ptr());
            if !handle.is_null() && GetLastError() == ERROR_ALREADY_EXISTS {
                // Another instance is already running — show a message and exit
                extern "system" {
                    fn MessageBoxW(
                        hwnd: *mut std::ffi::c_void,
                        text: *const u16,
                        caption: *const u16,
                        u_type: u32,
                    ) -> i32;
                }

                let text: Vec<u16> = OsStr::new(
                    "Quick Lock is already running in the background.\n\n\
                     Look for the Quick Lock icon (🛡️) in your system tray \
                     (bottom-right corner of the taskbar)."
                )
                    .encode_wide()
                    .chain(std::iter::once(0))
                    .collect();

                let caption: Vec<u16> = OsStr::new("Quick Lock — Already Running")
                    .encode_wide()
                    .chain(std::iter::once(0))
                    .collect();

                // MB_OK | MB_ICONINFORMATION = 0x00000040
                MessageBoxW(ptr::null_mut(), text.as_ptr(), caption.as_ptr(), 0x40);
                std::process::exit(0);
            }
            // The raw handle is never closed, so the mutex stays alive for the
            // lifetime of the process (the OS auto-releases it on exit)
            let _ = handle;
        }
    }

    quick_lock_lib::run();
}
