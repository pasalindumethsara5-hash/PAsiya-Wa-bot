@echo off
title PASIYA-MD - RE-LINK WHATSAPP
color 0b
cd /d "%~dp0"

echo ========================================================
echo        🔄 PASIYA-MD RE-LINK & SESSION RESET 🔄
echo ========================================================
echo.
echo [1/3] Stopping any running bot instances...
taskkill /F /IM node.exe >nul 2>nul

echo [2/3] Clearing old session folder...
if exist "session\" (
    rmdir /s /q session
    echo [OK] Old session removed!
) else (
    echo [OK] No existing session found.
)

echo.
echo [3/3] Starting bot for new Pairing Code...
echo.
echo 📱 Phone number eka country code ekath ekka gahanna (e.g. 94728433928):
echo.
node index.js

pause
