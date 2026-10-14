@echo off
cd /d "%~dp0"
set "LITALIANO_NODE=C:\Users\hmgo2\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%LITALIANO_NODE%" (
  "%LITALIANO_NODE%" abrir-menu.mjs --personal
) else (
  node abrir-menu.mjs --personal
)
if errorlevel 1 pause
