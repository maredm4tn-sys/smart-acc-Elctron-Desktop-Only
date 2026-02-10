@echo off
setlocal
echo ==========================================
echo   Smart Accountant MANUAL Launcher
echo ==========================================

:: 1. Define Paths
set "ROOT=%~dp0"
set "NODE_DIR=%ROOT%node_portable\node-v20.11.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

:: 2. Quick DB Repair (Targeting Node.js env)
echo 🔧 Fixing Database Driver...
call npm rebuild better-sqlite3

:: 3. Start Next.js Server (in separate window)
echo 🚀 Starting Web Server...
start "Smart Acc Server" cmd /c "npm run dev"

:: 4. Wait for Server to be ready
echo ⏳ Waiting 15 seconds for server...
timeout /t 15

:: 5. Launch Electron
echo ⚡ Launching App...
call npx electron .

pause
