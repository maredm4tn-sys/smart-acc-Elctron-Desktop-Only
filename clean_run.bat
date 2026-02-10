@echo off
setlocal
echo ==========================================
echo   Smart Accountant CLEAN Run
echo ==========================================

:: 1. Define Paths
set "ROOT=%~dp0"
set "NODE_DIR=%ROOT%node_portable\node-v20.11.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

:: 2. Delete Next.js Cache (The Fix)
if exist ".next" (
    echo 🧹 Cleaning Cache (.next)...
    rmdir /s /q ".next"
)

:: 3. Rebuild DB just in case
echo 🔧 Checking DB Driver...
call npm rebuild better-sqlite3

:: 4. Start Server
echo 🚀 Starting Web Server...
start "Smart Acc Server" cmd /c "npm run dev"

:: 5. Wait slightly longer for fresh build
echo ⏳ Waiting 20 seconds for rebuild...
timeout /t 20

:: 6. Launch App
echo ⚡ Launching App...
call npx electron .

pause
