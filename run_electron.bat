@echo off
setlocal
echo ==========================================
echo   🚀 Smart Accountant Desktop Launcher
echo ==========================================

:: 1. Define Paths
set "ROOT=%~dp0"
set "NODE_DIR=%ROOT%node_portable\node-v20.11.0-win-x64"

:: 2. CRITICAL: Add Portable Node to System PATH
set "PATH=%NODE_DIR%;%PATH%"

:: 3. Check dependencies
if not exist "node_modules\electron" (
    echo 📦 Installing dependencies...
    call npm install
)

:: 4. Run App
echo ⚡ Starting Application...
echo    Note: If a window asks for Firewall access, Allow it.
call npm run electron:dev

if %ERRORLEVEL% NEQ 0 (
    echo ❌ App crashed.
    pause
)
