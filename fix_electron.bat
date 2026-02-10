@echo off
setlocal
echo ==========================================
echo   Electron Quick Fixer
echo ==========================================

:: 1. Define Paths
set "ROOT=%~dp0"
set "NODE_DIR=%ROOT%node_portable\node-v20.11.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

:: 2. Remove corrupt electron
if exist "node_modules\electron" (
    echo 🗑️ Removing corrupt electron files...
    rmdir /s /q "node_modules\electron"
)

:: 3. Reinstall Electron
echo 📦 Cleaning npm cache...
call npm cache clean --force
echo 📦 Re-installing Electron 28.2.0 (this might take a minute)...
call npm install electron@28.2.0 --save-dev

echo.
echo ==========================================
echo   Electron Fixed!
echo   You can now run 'run_manual.bat'
echo ==========================================
pause
