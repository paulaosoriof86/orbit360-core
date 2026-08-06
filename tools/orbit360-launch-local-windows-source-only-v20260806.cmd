@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Orbit 360 - Preflight local source-only

set "BRANCH=ays/backend-tenant-lab-v99-20260703"
set "SCRIPT_REL=tools/orbit360-preflight-local-windows-source-only-v20260806.mjs"
set "REPORT_REL=orbit360-platform\runtime-gate-crm-v20260716\local-windows-source-only-preflight-sanitized-v20260806.json"
set "REPO="

for %%P in (
  "%USERPROFILE%\OneDrive\Documentos\GitHub\orbit360-core"
  "%USERPROFILE%\OneDrive\Documents\GitHub\orbit360-core"
  "%USERPROFILE%\Documents\GitHub\orbit360-core"
  "%USERPROFILE%\GitHub\orbit360-core"
  "C:\orbit360-core"
) do (
  if not defined REPO if exist "%%~fP\.git" set "REPO=%%~fP"
)

if not defined REPO (
  echo HOLD: No se encontro el repositorio local orbit360-core.
  echo Rutas revisadas bajo %USERPROFILE% y C:\orbit360-core.
  pause
  exit /b 42
)

where git.exe >nul 2>nul || (
  echo HOLD: Git no esta disponible en PATH.
  pause
  exit /b 42
)
where node.exe >nul 2>nul || (
  echo HOLD: Node.js no esta disponible en PATH.
  pause
  exit /b 42
)

cd /d "%REPO%" || exit /b 42
echo Repositorio: %REPO%
echo Rama remota: %BRANCH%
echo.

git fetch --prune origin "%BRANCH%"
if errorlevel 1 (
  echo HOLD: No fue posible actualizar la referencia remota.
  pause
  exit /b 42
)

set "TEMP_SCRIPT=%TEMP%\orbit360-preflight-local-windows-source-only-v20260806.mjs"
git show "origin/%BRANCH%:%SCRIPT_REL%" > "%TEMP_SCRIPT%"
if errorlevel 1 (
  echo HOLD: El preflight no esta disponible en el HEAD remoto.
  pause
  exit /b 42
)

node "%TEMP_SCRIPT%" "%REPO%"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if exist "%REPO%\%REPORT_REL%" (
  echo Reporte: %REPO%\%REPORT_REL%
  start "" notepad.exe "%REPO%\%REPORT_REL%"
) else (
  echo HOLD: No se genero el reporte sanitizado.
  set "EXIT_CODE=42"
)

if "%EXIT_CODE%"=="0" (
  echo PASS_LOCAL_WINDOWS_SOURCE_ONLY_PREFLIGHT
) else (
  echo HOLD_LOCAL_WINDOWS_SOURCE_ONLY_PREFLIGHT
)

pause
exit /b %EXIT_CODE%
