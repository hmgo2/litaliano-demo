@echo off
cd /d "%~dp0"
set "LITALIANO_NODE=C:\Users\hmgo2\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%LITALIANO_NODE%" (
  "%LITALIANO_NODE%" abrir-menu.mjs
) else (
  node abrir-menu.mjs
)
if errorlevel 1 pause
