@echo off
set "TARGET_DIR=C:\Users\l\.gemini\antigravity\scratch\smart-acc-Elctron-Desktop-Only\dist_new\win-unpacked\resources"

echo 🛠️  Forcing SQLite lib sync to production folder...

:: Ensure resources directory exists
if not exist "%TARGET_DIR%" (
    echo ❌ Production directory not found! Please make sure you ran a build first.
    exit /b 1
)

:: Create internal structure if needed
mkdir "%TARGET_DIR%\app.asar.unpacked\node_modules\better-sqlite3\build\Release" 2>nul

echo 📦 Copying SQLite native bindings...
copy /Y "C:\Users\l\.gemini\antigravity\scratch\smart-acc-Elctron-Desktop-Only\node_modules\better-sqlite3\build\Release\better_sqlite3.node" "%TARGET_DIR%\app.asar.unpacked\node_modules\better-sqlite3\build\Release\"

if %ERRORLEVEL% EQU 0 (
    echo ✅ SQLite bindings synced successfully!
    echo 🚀 Now close and restart the application from dist_new\win-unpacked\SmartAcc.exe
) else (
    echo ❌ FAILED to copy SQLite bindings. Is the app still open?
)

pause
