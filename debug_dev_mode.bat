@echo off
setlocal
title SMART ACCOUNTANT - DEBUG MODE (DEVELOPER)

echo ===================================================
echo   STOPPING OLD PROCESSES...
echo ===================================================
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1
taskkill /F /IM SmartAcc.exe >nul 2>&1

echo.
echo ===================================================
echo   STARTING DEVELOPMENT SERVER...
echo   PLEASE WAIT until you see "Ready in ..."
echo   THEN OPEN: http://localhost:3016
echo ===================================================
echo.

:: Increase memory for dev server
set NODE_OPTIONS=--max-old-space-size=4096

:: Run Next.js in Dev Mode
npm run dev

pause
