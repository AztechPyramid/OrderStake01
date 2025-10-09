@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -WindowStyle Normal -File "OrderStake-AutoDeploy.ps1"
pause