@echo off
title PASIYA-MD WHATSAPP BOT
color 0a
cd /d "%~dp0"

echo ========================================================
echo         👑 STARTING PASIYA-MD WHATSAPP BOT 👑
echo ========================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed on your computer!
    echo.
    echo Please download and install Node.js (LTS version) from:
    echo https://nodejs.org/
    echo.
    echo After installing Node.js, restart this script.
    echo.
    pause
    exit /b
)

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Installing required bot libraries... Please wait...
    echo.
    call npm install
    echo.
    echo [INFO] Libraries installed successfully!
    echo.
)

:: Start the bot
echo [INFO] Launching PASIYA-MD...
echo.
node index.js

pause
