@echo off
setlocal
echo ==========================================
echo   🚀 Building Smart Accountant (Memory Fix)
echo ==========================================

:: 1. Define Paths
set "ROOT=%~dp0"
set "NODE_DIR=%ROOT%node_portable\node-v20.11.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

:: 2. CRITICAL: LIMIT MEMORY TO 4GB TO PREVENT CRASH
set "NODE_OPTIONS=--max-old-space-size=4096"

:: 3. Kill any stuck processes just in case
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM electron.exe /T 2>nul

echo 🏗️ Starting Production Build (4GB Limit)...
call npm run electron:build

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Build Failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ✅ BUILD SUCCESSFUL!
echo Check dist_new/win-unpacked
pause
