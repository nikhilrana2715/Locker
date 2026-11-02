$mingwBin = "C:\Users\nikhi\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin"
$env:PATH = "N:\Locker\src-tauri\target\debug;$mingwBin;$env:PATH"

$exe = (Get-ChildItem "N:\Locker\src-tauri\target\debug\deps\quick_lock_lib-*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $exe
$psi.WorkingDirectory = "N:\Locker\src-tauri\target\debug"
$psi.Arguments = "--list"
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false

$p = [System.Diagnostics.Process]::Start($psi)
$out = $p.StandardOutput.ReadToEnd()
$err = $p.StandardError.ReadToEnd()
$p.WaitForExit()

Write-Host "Exit Code:" $p.ExitCode
Write-Host "Stdout:" $out
Write-Host "Stderr:" $err
