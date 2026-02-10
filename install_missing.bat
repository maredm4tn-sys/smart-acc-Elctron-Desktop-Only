@echo off
setlocal
echo ==========================================
echo   Smart Accountant Tool Restorer (v2)
echo ==========================================

:: 1. Setup Path for Portable Node (Exact Path Match)
set "ROOT=%~dp0"
set "NODE_DIR=%ROOT%node_portable\node-v20.11.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

:: Debug: Check if node is found
node -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found at: %NODE_DIR%
    echo please verify the folder name in node_portable.
    pause
    exit /b
)

echo.
echo [1/2] Installing missing tools (concurrently, wait-on)...
call npm install concurrently wait-on --save-dev

echo.
echo [2/2] Updating better-sqlite3 for Node...
call npm rebuild better-sqlite3

echo.
echo ==========================================
echo   Repair Complete!
echo   You can now run 'run_electron.bat'
echo ==========================================
pause
