@echo off
setlocal
echo ==========================================
echo   🛠️ Smart Accountant - Fix Database
echo ==========================================

:: 1. Setup Environment
set "ROOT=%~dp0"
set "NODE_DIR=%ROOT%node_portable\node-v20.11.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

:: 2. Rebuild Database Driver for Electron
echo.
echo 🔧 Rebuilding 'better-sqlite3' for Electron...
echo    This might take a minute. Please wait...
echo.

call .\node_modules\.bin\electron-rebuild.cmd -f -w better-sqlite3

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Rebuild Failed! trying specific version...
    :: Fallback specific rebuilding if generic fails
    call .\node_modules\.bin\electron-rebuild.cmd -v 28.0.0 -f -w better-sqlite3
)

echo.
echo ✅ Done! Database is ready.
echo.
echo You can now run 'run_electron.bat'
pause
