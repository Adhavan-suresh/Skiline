@echo off
cd /d "d:\SkiLine\Ads - Skiline - Chennai - Agents\chennai"
"C:\Program Files\nodejs\node.exe" scripts\campaign-ops\weekly-toggle.js >> logs\toggle.log 2>&1
