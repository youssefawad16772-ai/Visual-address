@echo off
chcp 65001 > nul
echo ===================================================
echo     Smart Address Egypt CRM - Sales Management
echo ===================================================
echo.
echo جاري تشغيل خادم النظام على: http://localhost:3456
echo.

start "" "http://localhost:3456"

set ELECTRON_RUN_AS_NODE=1
"C:\Users\Youssef\AppData\Local\Programs\antigravity\Antigravity.exe" server.js
pause
