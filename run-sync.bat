@echo off
cd /d "d:\SkiLine\Ads - Skiline - Chennai - Agents"
rem Real-time capture now goes through the Vercel webhook (api/webhook.js).
rem This daily run is just a reconciliation safety net, using the script that
rem stamps source-ad attribution correctly. scripts\sync-leads.js is retired —
rem it lacked attribution and was the cause of untagged leads (fixed 2026-07-23).
"C:\Program Files\nodejs\node.exe" scripts\sync-all-leads.js >> logs\sync.log 2>&1
