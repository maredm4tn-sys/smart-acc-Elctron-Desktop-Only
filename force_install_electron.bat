@echo off
setlocal
echo ==========================================
echo   Force Install Electron (Verified)
echo ==========================================

:: 1. Define Paths
set "ROOT=%~dp0"
set "NODE_DIR=%ROOT%node_portable\node-v20.11.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

:RETRY
echo.
echo [1/3] Cleaning up old/corrupt electron...
if exist "node_modules\electron" rmdir /s /q "node_modules\electron"

echo.
echo [2/3] Installing Electron v28.0.0...
call npm install electron@28.0.0 --save-dev --verbose

echo.
echo [3/3] Verifying integrity...
if exist "node_modules\electron\cli.js" (
    echo ✅ SUCCESS: Electron is installed correctly!
    echo.
    echo ==========================================
    echo   Now running the App...
    echo ==========================================
    call run_manual.bat
) else (
    echo ❌ ERROR: Installation failed. File 'cli.js' is missing.
    echo.
    echo Retrying in 5 seconds...
    timeout /t 5
    goto RETRY
)

pause
