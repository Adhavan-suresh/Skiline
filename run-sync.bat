@echo off
cd /d "d:\SkiLine\Ads - Skiline - Chennai - Agents"
"C:\Program Files\nodejs\node.exe" scripts\sync-leads.js >> logs\sync.log 2>&1
