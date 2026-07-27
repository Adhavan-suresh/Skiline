@echo off
rem DEPRECATED 2026-07-23: Surat leads now captured in real-time by the Vercel
rem webhook (skiline-zeta.vercel.app/api/webhook). This script did per-row
rem UPDATE calls and regularly hit Google Sheets API write-quota errors, and
rem never captured source-ad attribution. Its scheduled task has been disabled.
rem Left in place only for manual reference — do not re-enable the task.
cd /d "d:\SkiLine\Ads - Skiline - Chennai - Agents\surat"
"C:\Program Files\nodejs\node.exe" scripts\archive\sync-leads.js >> logs\sync.log 2>&1
exit /b %ERRORLEVEL%
