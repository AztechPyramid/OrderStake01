@echo off
title OrderStake Auto Deploy - Terminal Version
color 0A
cd /d "%~dp0"

echo.
echo ==========================================
echo   ORDERSTAKE AUTO DEPLOY v2.0
echo   Terminal Based - No GUI Issues
echo ==========================================
echo.
echo Starting terminal application...
echo This version has NO .NET Framework dependencies!
echo.

powershell -ExecutionPolicy Bypass -File "OrderStake-Terminal.ps1"

echo.
echo Application closed.
echo Press any key to exit...
pause >nul