@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Smart Accountant - Code Audit v4.0
echo ========================================
echo.

set /a f_all=0, l_all=0
set /a f_tsx=0, l_tsx=0
set /a f_ts=0, l_ts=0
set /a f_js=0, l_js=0
set /a f_json=0, l_json=0
set /a f_css=0, l_css=0

echo Please wait, auditing your work...
echo [Scanning subdirectories...]

for /f "delims=" %%F in ('dir /s /b /a-d') do (
    set "P=%%~fF"
    set "E=%%~xF"
    
    set "SKIP="
    REM Robust exclusion logic
    echo !P! | findstr /i "\\node_modules\\" >nul && set "SKIP=1"
    echo !P! | findstr /i "\\\.next\\" >nul && set "SKIP=1"
    echo !P! | findstr /i "\\dist\\" >nul && set "SKIP=1"
    echo !P! | findstr /i "\\dist_new\\" >nul && set "SKIP=1"
    echo !P! | findstr /i "\\\.git\\" >nul && set "SKIP=1"
    echo !P! | findstr /i "node_portable" >nul && set "SKIP=1"
    echo !P! | findstr /i "package-lock.json" >nul && set "SKIP=1"
    
    if not defined SKIP (
        set "T="
        if /i "!E!"==".tsx" set "T=tsx"
        if /i "!E!"==".ts" set "T=ts"
        if /i "!E!"==".js" set "T=js"
        if /i "!E!"==".json" set "T=json"
        if /i "!E!"==".css" set "T=css"
        
        if defined T (
            set /a f_all+=1
            for /f %%L in ('type "%%F" ^| find /c /v ""') do set "LC=%%L"
            set /a l_all+=LC
            
            if "!T!"=="tsx" ( set /a f_tsx+=1 & set /a l_tsx+=LC )
            if "!T!"=="ts" ( set /a f_ts+=1 & set /a l_ts+=LC )
            if "!T!"=="js" ( set /a f_js+=1 & set /a l_js+=LC )
            if "!T!"=="json" ( set /a f_json+=1 & set /a l_json+=LC )
            if "!T!"=="css" ( set /a f_css+=1 & set /a l_css+=LC )
        )
    )
)

echo.
echo ----------------------------------------
echo   PROJECT AUDIT REPORT
echo ----------------------------------------
echo.
echo  - React Components (.tsx) : !f_tsx! files ^| !l_tsx! lines
echo  - Business Logic   (.ts ) : !f_ts! files ^| !l_ts! lines
echo  - Shell/Scripts    (.js ) : !f_js! files ^| !l_js! lines
echo  - Translations     (.json): !f_json! files ^| !l_json! lines
echo  - Global Styles    (.css ) : !f_css! files ^| !l_css! lines
echo.
echo ----------------------------------------
echo   TOTAL SOURCE FILES : !f_all!
echo   TOTAL SOURCE LINES : !l_all!
echo ----------------------------------------
echo.
echo Finished audit successfully!
pause
