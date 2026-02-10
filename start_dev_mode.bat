@echo off
setlocal
title SMART ACCOUNTANT - DEVELOPER MODE

echo ===================================================
echo   FIXING WORKING DIRECTORY...
echo ===================================================
:: Change directory to the script location (Crucial for Run as Admin)
cd /d "%~dp0"

echo Current Dir: %CD%

echo.
echo ===================================================
echo   STOPPING OLD PROCESSES...
echo ===================================================
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1
taskkill /F /IM SmartAcc.exe >nul 2>&1

echo.
echo ===================================================
echo   SETTING UP ENVIRONMENT...
echo ===================================================

:: Define Paths explicitly
set "NODE_DIR=%CD%\node_portable\node-v20.11.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

:: Verify Node existence
if not exist "%NODE_DIR%\node.exe" (
    echo ERROR: Node.exe not found at:
    echo %NODE_DIR%\node.exe
    pause
    exit /b
)

echo Using Node from: %NODE_DIR%
"%NODE_DIR%\node.exe" -v

echo.
echo ===================================================
echo   STARTING DEVELOPMENT SERVER...
echo   PLEASE WAIT until you see "Ready in ..."
echo   THEN OPEN: http://localhost:3016
echo ===================================================
echo.

:: Increase memory for dev server
set NODE_OPTIONS=--max-old-space-size=4096

:: Run Next.js directly using explicit path
if not exist "node_modules\next\dist\bin\next" (
    echo ERROR: Next.js binary not found!
    echo Are you in the correct folder?
    pause
    exit /b
)

"%NODE_DIR%\node.exe" "node_modules\next\dist\bin\next" dev -p 3016

echo.
echo Server Stopped.
pause
