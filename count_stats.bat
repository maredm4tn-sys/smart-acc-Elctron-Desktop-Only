@echo off
setlocal

:: Find local node path
set "NODE_EXE=%~dp0node_portable\node-v20.11.0-win-x64\node.exe"

if exist "%NODE_EXE%" (
    "%NODE_EXE%" audit_logic.js
) else (
    :: Try global node if local not found
    node audit_logic.js
)

echo.
pause
