@echo off
setlocal
set FOLDER_NAME=smart-acc-Elctron-Desktop-Only

echo === Starting GitHub Upload Process ===

:: Check if Git is initialized
if not exist .git (
    echo Initializing Git...
    git init
    git branch -M main
)

:: Add all files
echo Adding files...
git add .

:: Commit changes
echo Committing changes...
git commit -m "Auto-backup from Desktop Tool"

:: Check if remote exists
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ACTION REQUIRED]
    echo 1. Go to: https://github.com/new
    echo 2. Set repository name to: %FOLDER_NAME%
    echo 3. Click "Create repository"
    echo 4. Copy the URL (starts with https://github.com/...)
    echo.
    set /p REPO_URL="Paste your GitHub Repository URL here and press Enter: "
    git remote add origin %REPO_URL%
)

:: Push to GitHub
echo Uploading to GitHub...
git push -u origin main

echo.
echo === Done! Your project is now safe on GitHub ===
pause
