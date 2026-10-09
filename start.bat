@echo off
title Smart Address Egypt CRM - نظام إدارة وتحليل العملاء
echo ============================================================
echo   Smart Address Egypt CRM - سمارت أدريس مصر
echo   نظام إدارة وتحليل العملاء المحتملين ومتابعات المبيعات
echo ============================================================
echo جاري تشغيل الخادم المحلي وفتح البرنامج...
cd /d "%~dp0"
start "" powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0server.ps1"
timeout /t 2 /nobreak >nul
start http://localhost:5173
echo تم التشغيل بنجاح!
