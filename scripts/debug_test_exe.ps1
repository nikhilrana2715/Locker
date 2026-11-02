$mingwBin = "C:\Users\nikhi\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin"
$env:PATH = "$mingwBin;N:\Locker\src-tauri\target\debug\deps;$env:PATH"

$targetExe = (Get-ChildItem "N:\Locker\src-tauri\target\debug\deps\quick_lock_lib-*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
Write-Host "Target exe: $targetExe"

$p = Start-Process -FilePath $targetExe -ArgumentList "--list" -PassThru -Wait -NoNewWindow
Write-Host "Exit Code:" $p.ExitCode
