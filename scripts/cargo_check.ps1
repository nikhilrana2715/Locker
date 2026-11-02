$mingwBin = "C:\Users\nikhi\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin"
$cargoBin = "$env:USERPROFILE\.cargo\bin"
$env:PATH = "N:\Locker\src-tauri\target\debug\deps;$mingwBin;$cargoBin;$env:PATH"

Write-Host "Running cargo check..."
& "$cargoBin\cargo.exe" +stable-x86_64-pc-windows-gnu check --manifest-path "N:\Locker\src-tauri\Cargo.toml"
