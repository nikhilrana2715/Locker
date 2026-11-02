import subprocess
import ctypes
import os
import glob

exes = glob.glob(r"N:\Locker\src-tauri\target\debug\deps\quick_lock_lib-*.exe")
latest_exe = max(exes, key=os.path.getmtime)
print("Target:", latest_exe)

objdump = r"C:\Users\nikhi\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin\objdump.exe"
proc = subprocess.run([objdump, "-p", latest_exe], capture_output=True, text=True)

# Parse between "The Import Tables" and the next table
in_import = False
current_dll = None
dll_to_syms = {}

for line in proc.stdout.splitlines():
    if "The Import Tables" in line:
        in_import = True
        continue
    if in_import:
        if "The Function Table" in line or "Export Address Table" in line:
            break
        if line.strip().startswith("DLL Name:"):
            current_dll = line.strip().split(":", 1)[1].strip()
            dll_to_syms[current_dll] = []
        elif current_dll and "\thHint[" in line or "\t" in line:
            parts = line.strip().split()
            if len(parts) >= 3 and parts[0].isdigit():
                sym = parts[-1]
                dll_to_syms[current_dll].append(sym)

os.environ["PATH"] = r"N:\Locker\src-tauri\target\debug\deps;" + os.environ.get("PATH", "")

print(f"Checking {len(dll_to_syms)} imported DLLs...")
missing_count = 0
for dll, syms in dll_to_syms.items():
    dll_path = dll
    if os.path.exists(os.path.join(r"N:\Locker\src-tauri\target\debug\deps", dll)):
        dll_path = os.path.join(r"N:\Locker\src-tauri\target\debug\deps", dll)
    h = ctypes.windll.kernel32.LoadLibraryW(dll_path)
    if not h:
        err = ctypes.GetLastError()
        print(f"[MISSING DLL] {dll} (Error code: {err})")
        missing_count += 1
        continue
    for s in syms:
        p = ctypes.windll.kernel32.GetProcAddress(h, s.encode('ascii'))
        if not p:
            print(f"[MISSING SYMBOL] DLL: {dll} -> Symbol: {s}")
            missing_count += 1

print(f"Done. Missing items count: {missing_count}")
