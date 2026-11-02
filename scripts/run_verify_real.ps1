$mingwBin = "C:\Users\nikhi\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin"
$cargoBin = "$env:USERPROFILE\.cargo\bin"
$env:PATH = "N:\Locker\src-tauri\target\debug\deps;N:\Locker\src-tauri\target\debug;$mingwBin;$cargoBin;$env:PATH"

Write-Host "Compiling and running real-world audit example..."
& "$cargoBin\cargo.exe" +stable-x86_64-pc-windows-gnu run --example verify_real --manifest-path "N:\Locker\src-tauri\Cargo.toml"
