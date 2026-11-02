$events = Get-WinEvent -FilterHashtable @{LogName='Application'} -MaxEvents 30
foreach ($evt in $events) {
    if ($evt.Message -match "quick_lock" -or $evt.Message -match "0xc0000139" -or $evt.Id -eq 1000) {
        Write-Host "Time: " $evt.TimeCreated
        Write-Host "Id: " $evt.Id
        Write-Host "Msg: " $evt.Message
        Write-Host "--------------------------------"
    }
}
