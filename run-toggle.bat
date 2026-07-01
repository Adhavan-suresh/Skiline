@echo off
cd /d "d:\SkiLine\Ads - Skiline - Chennai - Agents"
"C:\Program Files\nodejs\node.exe" scripts\weekly-toggle.js >> logs\toggle.log 2>&1
