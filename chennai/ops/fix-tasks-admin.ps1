# Run this as Administrator
# Right-click PowerShell → "Run as administrator" → paste and run

$syncAction = New-ScheduledTaskAction -Execute '"d:\SkiLine\Ads - Skiline - Chennai - Agents\chennai\run-sync.bat"'
Set-ScheduledTask -TaskName "SkiLine-Sync-Leads-Daily" -Action $syncAction
Write-Host "✅ Sync task fixed"

$toggleAction = New-ScheduledTaskAction -Execute '"d:\SkiLine\Ads - Skiline - Chennai - Agents\chennai\run-toggle.bat"'
Set-ScheduledTask -TaskName "SkiLine-Toggle-Ads-Weekly" -Action $toggleAction
Write-Host "✅ Toggle task fixed"

$suratAction = New-ScheduledTaskAction -Execute '"d:\SkiLine\Ads - Skiline - Chennai - Agents\surat\run-sync.bat"'
Set-ScheduledTask -TaskName "Skiline Surat Leads Sync" -Action $suratAction
Write-Host "✅ Surat sync task fixed"

# Verify
Write-Host "`nVerified paths:"
(Get-ScheduledTask -TaskName "SkiLine-Sync-Leads-Daily").Actions | Select-Object Execute
(Get-ScheduledTask -TaskName "SkiLine-Toggle-Ads-Weekly").Actions | Select-Object Execute
(Get-ScheduledTask -TaskName "Skiline Surat Leads Sync").Actions | Select-Object Execute
