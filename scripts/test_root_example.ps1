$mingwBin = "C:\Users\nikhi\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin"
$env:PATH = "$mingwBin;N:\Locker\src-tauri\target\debug;$env:PATH"

Copy-Item "N:\Locker\src-tauri\target\debug\examples\verify_real.exe" "N:\Locker\src-tauri\target\debug\verify_real_root.exe"

$p = New-Object System.Diagnostics.Process
$p.StartInfo.FileName = "N:\Locker\src-tauri\target\debug\verify_real_root.exe"
$p.StartInfo.UseShellExecute = $false
$p.StartInfo.RedirectStandardOutput = $true
$p.StartInfo.RedirectStandardError = $true
$p.Start() | Out-Null

$stdout = $p.StandardOutput.ReadToEnd()
$stderr = $p.StandardError.ReadToEnd()
$p.WaitForExit()

Write-Host "Exit Code:" $p.ExitCode
Write-Host "STDOUT:" $stdout
Write-Host "STDERR:" $stderr

Remove-Item "N:\Locker\src-tauri\target\debug\verify_real_root.exe"
