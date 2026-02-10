@echo off
setlocal
set REPO_NAME=smart-acc-Elctron-Desktop-Only

echo === Starting Smart GitHub Upload ===

:: 1. Initialize Git if not exists
if not exist .git (
    echo [1/4] Initializing Git...
    git init
    git branch -M main
)

:: 2. Add and Commit
echo [2/4] Preparing files for backup...
git add .
git commit -m "Auto-backup: %date% %time%"

:: 3. Check/Create Repository on GitHub using 'gh'
echo [3/4] Checking GitHub repository status...
gh repo view %REPO_NAME% >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Repository not found on GitHub. Creating it now...
    gh repo create %REPO_NAME% --public --source=. --remote=origin
    echo Created and linked successfully!
) else (
    :: Ensure remote is linked if repo exists but not added locally
    git remote get-url origin >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo Linking to existing GitHub repository...
        for /f "tokens=*" %%i in ('gh repo view %REPO_NAME% --json url -q .url') do git remote add origin %%i
    )
)

:: 4. Push changes
echo [4/4] Uploading code to GitHub...
git push -u origin main

echo.
echo ========================================
echo   SUCCESS! Your project is now secured.
echo ========================================
pause
