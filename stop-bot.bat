@echo off
title STOP PASIYA-MD
color 0c
echo ========================================================
echo          🛑 STOPPING PASIYA-MD WHATSAPP BOT 🛑
echo ========================================================
echo.
taskkill /F /IM node.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [SUCCESS] PASIYA-MD background bot stopped successfully!
) else (
    echo [INFO] PASIYA-MD is not running.
)
echo.
pause
