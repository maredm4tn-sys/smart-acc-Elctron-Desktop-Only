@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo   🛰️  PRO NATIVE REBUILD AND BUILD - Smart Accountant
echo ==========================================

:: 1. Define Paths
set "ROOT=%~dp0"
set "NODE_DIR=%ROOT%node_portable\node-v20.11.0-win-x64"
set "PATH=%NODE_DIR%;%ROOT%node_modules\.bin;%PATH%"

:: 1.2 Force kill existing processes TRIPLE STACK
echo 🔫 Killing all related processes...
taskkill /F /IM "SmartAcc.exe" /T 2>nul
taskkill /F /IM "electron.exe" /T 2>nul
taskkill /F /IM "node.exe" /T 2>nul
wmic process where "name='SmartAcc.exe'" delete 2>nul
wmic process where "name='node.exe'" delete 2>nul
timeout /t 3 /nobreak >nul

:: Set memory limit for the heavy build parts
set "NODE_OPTIONS=--max-old-space-size=4096"

:: 1.5 DEEP CLEAN with verify
echo 🧹 Cleaning old build artifacts...
if exist "dist_new" (
    echo Removing dist_new...
    rmdir /s /q "dist_new" 2>nul
)
if exist ".next" (
    echo Removing .next...
    rmdir /s /q ".next" 2>nul
)
timeout /t 2 /nobreak >nul

:: 2. DUAL NATIVE REBUILD
echo 🛠️ Step 2.1: Rebuilding better-sqlite3 for Standalone Node 20 (ABI 115)...
if exist "node_modules\better-sqlite3\build" rmdir /s /q "node_modules\better-sqlite3\build"

call npm rebuild better-sqlite3
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node 20 Rebuild Failed.
    pause
    exit /b %ERRORLEVEL%
)

echo 💾 Preserving Node 20 binary to PROJECT ROOT...
if exist "%ROOT%better_sqlite3_node20.node" del /f /q "%ROOT%better_sqlite3_node20.node"
copy /Y "node_modules\better-sqlite3\build\Release\better_sqlite3.node" "%ROOT%better_sqlite3_node20.node"

echo 🛠️ Step 2.2: Rebuilding better-sqlite3 for Electron 33 (ABI 130)...
set "npm_config_runtime=electron"
set "npm_config_target=33.4.11"
set "npm_config_disturl=https://electronjs.org/headers"
set "npm_config_arch=x64"
set "npm_config_target_arch=x64"
set "npm_config_build_from_source=true"

call npm rebuild better-sqlite3
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Electron Rebuild Failed.
    pause
    exit /b %ERRORLEVEL%
)

:: Reset environment variables
set "npm_config_runtime="
set "npm_config_target="
set "npm_config_disturl="
set "npm_config_build_from_source="

:: 3. RUN BUILD
echo 🏗️ Starting Production Build...
echo 1/2: Building Next.js...
call "%ROOT%node_modules\.bin\next.cmd" build

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Next.js Build Failed.
    pause
    exit /b %ERRORLEVEL%
)

echo 2/2: Packaging Electron...
set NODE_OPTIONS=
call "%ROOT%node_modules\.bin\electron-builder.cmd" --win --x64 --dir

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Electron Packaging Failed.
    pause
    exit /b %ERRORLEVEL%
)

:: 4. 🛠️ PATCHING AND SYNCING
echo 🛠️ Finalizing native modules...

set "APP_DIR=%ROOT%dist_new\win-unpacked\resources"
set "APP_NM=%APP_DIR%\app\node_modules\better-sqlite3\build\Release"
set "SERVER_NM=%APP_DIR%\app-server\node_modules"

set "SRC_ELECTRON=%ROOT%node_modules\better-sqlite3\build\Release\better_sqlite3.node"
set "SRC_NODE20=%ROOT%better_sqlite3_node20.node"

:: A. Ensure Main App has Electron binary for better-sqlite3
if exist "%SRC_ELECTRON%" (
    if not exist "%APP_NM%" mkdir "%APP_NM%" 2>nul
    echo Patching APP resources with Electron binary...
    copy /Y "%SRC_ELECTRON%" "%APP_NM%\better_sqlite3.node"
)

:: B. Sync dependencies and ensure Server has Node 20 binary
echo 📂 Syncing dependencies to app-server...
if not exist "%SERVER_NM%" mkdir "%SERVER_NM%" 2>nul

for %%d in (better-sqlite3 drizzle-orm drizzle-kit bindings file-uri-to-path bcryptjs) do (
    if exist "%ROOT%node_modules\%%d" (
        xcopy /E /I /Y "%ROOT%node_modules\%%d" "%SERVER_NM%\%%d" >nul
    )
)

if exist "%SERVER_NM%\better-sqlite3\build\Release" (
    echo Patching Server with Node 20 binary...
    if exist "%SRC_NODE20%" (
        copy /Y "%SRC_NODE20%" "%SERVER_NM%\better-sqlite3\build\Release\better_sqlite3.node"
    )
)

echo.
echo ✅ ALL DONE!
echo 🚀 Launching: dist_new\win-unpacked\SmartAcc.exe
echo 🕒 Waiting 5 seconds...
timeout /t 5 /nobreak >nul

:: TRY TO LAUNCH WITHOUT ELEVATION FIRST
start "" "%ROOT%dist_new\win-unpacked\SmartAcc.exe"

if %ERRORLEVEL% NEQ 0 (
    echo ⚠️ Launch failed with error %ERRORLEVEL%.
)

pause
