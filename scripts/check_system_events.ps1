$events = Get-WinEvent -FilterHashtable @{LogName='System'} -MaxEvents 50
foreach ($evt in $events) {
    if ($evt.ProviderName -match "Popup" -or $evt.Message -match "quick_lock" -or $evt.Message -match "entrypoint" -or $evt.Id -eq 26) {
        Write-Host "Time: " $evt.TimeCreated
        Write-Host "Provider: " $evt.ProviderName
        Write-Host "Id: " $evt.Id
        Write-Host "Message: " $evt.Message
        Write-Host "------------------------"
    }
}
