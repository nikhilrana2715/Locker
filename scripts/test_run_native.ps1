$mingwBin = "C:\Users\nikhi\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin"
$env:PATH = "$mingwBin;N:\Locker\src-tauri\target\debug;$env:PATH"

$exe = "N:\Locker\src-tauri\target\debug\quick-lock.exe"
Write-Host "Starting quick-lock.exe in background to test startup..."

$p = Start-Process -FilePath $exe -PassThru
Start-Sleep -Seconds 3

Write-Host "Process ID:" $p.Id
Write-Host "Has Exited:" $p.HasExited
if ($p.HasExited) {
    Write-Host "Exit Code:" $p.ExitCode
} else {
    Write-Host "Success! The Tauri process is running actively!"
    # Stop it so we don't leave background instance running
    Stop-Process -Id $p.Id -Force
    Write-Host "Stopped test instance."
}
