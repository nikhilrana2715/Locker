import subprocess
import glob
import os

objdump = r"C:\Users\nikhi\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin\objdump.exe"

def get_dlls(path):
    proc = subprocess.run([objdump, "-p", path], capture_output=True, text=True)
    dlls = set()
    for line in proc.stdout.splitlines():
        if line.strip().startswith("DLL Name:"):
            dlls.add(line.strip().split(":", 1)[1].strip())
    return dlls

main_exe = r"N:\Locker\src-tauri\target\debug\quick-lock.exe"
test_exe = max(glob.glob(r"N:\Locker\src-tauri\target\debug\deps\quick_lock_lib-*.exe"), key=os.path.getmtime)

main_dlls = get_dlls(main_exe)
test_dlls = get_dlls(test_exe)

print("DLLs in test_exe but NOT in main_exe:")
for d in test_dlls - main_dlls:
    print(" +", d)

print("DLLs in main_exe but NOT in test_exe:")
for d in main_dlls - test_dlls:
    print(" -", d)
