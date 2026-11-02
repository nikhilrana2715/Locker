$mingwBin = "C:\Users\nikhi\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin"
$env:PATH = "$mingwBin;N:\Locker\src-tauri\target\debug;$env:PATH"

$exe = "N:\Locker\src-tauri\target\debug\examples\verify_real.exe"
Write-Host "Running $exe directly..."
& $exe
Write-Host "ExitCode: $LASTEXITCODE"
