$mingwBin = "C:\Users\nikhi\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin"
$env:PATH = "$mingwBin;N:\Locker\src-tauri\target\debug;$env:PATH"

$p = New-Object System.Diagnostics.Process
$p.StartInfo.FileName = "N:\Locker\src-tauri\target\debug\quick-lock.exe"
$p.StartInfo.UseShellExecute = $false
$p.StartInfo.RedirectStandardOutput = $true
$p.StartInfo.RedirectStandardError = $true
$p.Start() | Out-Null

Start-Sleep -Seconds 2
Write-Host "Is Running:" (-not $p.HasExited)
if ($p.HasExited) {
    Write-Host "Exit Code:" $p.ExitCode
} else {
    Write-Host "STILL RUNNING! PID:" $p.Id
    $p.Kill()
}
