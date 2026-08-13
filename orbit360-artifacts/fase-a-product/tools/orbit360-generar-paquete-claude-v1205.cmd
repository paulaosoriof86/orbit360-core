@echo off
chcp 65001 >nul
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0orbit360-generar-paquete-claude-v1205.ps1"
set CODE=%ERRORLEVEL%
if not "%CODE%"=="0" (
  echo.
  echo La generacion del paquete se bloqueo. El mensaje exacto quedo visible y copiado.
  pause
)
exit /b %CODE%
