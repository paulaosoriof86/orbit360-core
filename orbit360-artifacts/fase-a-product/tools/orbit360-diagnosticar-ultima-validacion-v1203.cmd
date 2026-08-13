@echo off
chcp 65001 >nul
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0orbit360-diagnosticar-ultima-validacion-v1203.ps1"
set CODE=%ERRORLEVEL%
if not "%CODE%"=="0" pause
exit /b %CODE%
