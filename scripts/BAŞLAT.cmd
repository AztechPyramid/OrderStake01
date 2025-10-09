@echo off
title 🚀 OrderStake Auto Deploy Launcher
color 0A
cd /d "%~dp0"

echo.
echo ==========================================
echo   🚀 ORDERSTAKE AUTO DEPLOY LAUNCHER  
echo ==========================================
echo.
echo 📱 Windows uygulaması başlatılıyor...
echo 🛡️ Grafik arayüz açılacak!
echo.

powershell.exe -ExecutionPolicy Bypass -WindowStyle Normal -File "OrderStake-AutoDeploy.ps1"

echo.
echo 📱 Uygulama kapatıldı.
echo.
pause