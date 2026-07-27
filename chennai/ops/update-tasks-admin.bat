@echo off
rem DEPRECATED — pointed at a stale/wrong path even before the 2026-07-27 reorg.
rem Use fix-tasks-admin.ps1 instead (kept here only for audit-trail history).
echo Updating SkiLine task paths...

schtasks /change /tn "SkiLine-Sync-Leads-Daily" /tr "\"d:\SkiLine\Ads - Skiline\run-sync.bat\""
if %errorlevel%==0 (echo [OK] Sync task updated) else (echo [FAIL] Sync task)

schtasks /change /tn "SkiLine-Toggle-Ads-Weekly" /tr "\"d:\SkiLine\Ads - Skiline\run-toggle.bat\""
if %errorlevel%==0 (echo [OK] Toggle task updated) else (echo [FAIL] Toggle task)

echo Done.
pause
