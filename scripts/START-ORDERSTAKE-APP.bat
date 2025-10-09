@echo off
title 🚀 OrderStake Auto Deploy Launcher
color 0A

echo ==========================================
echo   🚀 ORDERSTAKE AUTO DEPLOY LAUNCHER
echo ==========================================
echo.
echo 📱 Windows uygulaması başlatılıyor...
echo 🛡️ Bu uygulama ASLA kapanmaz!
echo.

REM PowerShell uygulamasını başlat
powershell -ExecutionPolicy Bypass -File "%~dp0OrderStake-AutoDeploy.ps1"

echo.
echo 📱 Uygulama kapatıldı.
pause