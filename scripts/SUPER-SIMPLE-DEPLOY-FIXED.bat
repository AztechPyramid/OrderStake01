@echo off
title 🚀 SUPER SIMPLE Auto Deploy - Her 1 dakika DEPLOY!
color 0A

REM ULTIMATE PROTECTION - ASLA KAPANMAZ!
if "%1"=="RESTART" goto RESTART_POINT

:MAIN_ENTRY
REM Ana dizine geç
cd /d "%~dp0.."

setlocal EnableDelayedExpansion

REM Eğer kritik hata olursa kendini yeniden başlat
set RESTART_BAT=%0

:RESTART_POINT

cls
echo ==========================================
echo   🚀 SUPER SIMPLE Auto Deploy
echo   ⚡ Her 1 dakikada OTOMATIK DEPLOY!
echo ==========================================
echo 📂 Directory: %CD%
echo ⏰ Started: %date% %time%
echo.

REM Dosya kontrolü
if not exist "indexer\indexer.js" (
    echo ❌ HATA: indexer\indexer.js bulunamadı!
    echo ⚠️ Terminal açık kalacak, dosyayı yerleştirdikten sonra tekrar başlatın...
    echo 🔄 5 saniye bekleyip tekrar kontrol ediliyor...
    timeout /t 5 /nobreak >nul
    goto RESTART_POINT
)

echo ✅ Sistem hazır! Sürekli deploy başlatılıyor...
echo 🔄 Index → Deploy → 60s bekle → Tekrarla
echo.
echo 🚀 ENTER ile başlat!
pause

set CYCLE=1

:SIMPLE_LOOP
REM HATA YAKALAMA - Döngü hiç bitmemesin
set ERROR_OCCURRED=0
echo.
echo ================================================
echo [%date% %time%] CYCLE #%CYCLE% BAŞLADI - TERMINAL ASLA KAPANMAZ!
echo ================================================
cls
echo ==========================================
echo   🚀 SUPER SIMPLE Auto Deploy
echo   🔄 CYCLE #%CYCLE% - OTOMATIK DEPLOY!
echo ==========================================
echo ⏰ Current Time: %time%
echo 🎯 Index → Deploy → 60s wait → Repeat
echo.

REM Hata olursa bile devam et
echo [CYCLE #%CYCLE%] 📊 1/3 - Indexing from last block... (Son kaldığı bloktan devam)
if not exist "indexer\indexer.js" (
    echo ❌ indexer.js bulunamadı, atlanıyor...
    goto SKIP_INDEX
)

cd indexer
node indexer.js --once
set ERROR_CODE=!errorlevel!
cd ..

:SKIP_INDEX
if !ERROR_CODE! neq 0 (
    echo ❌ Indexer error code: !ERROR_CODE! (continuing anyway)
    set ERROR_OCCURRED=1
) else (
    echo ✅ Indexer completed
)

echo [CYCLE #%CYCLE%] 📄 2/3 - Updating API files... (Hata olsa bile devam)
copy "indexer\data\*.json" "public\api\" >nul 2>&1 || echo ⚠️ Copy 1 failed, continuing...
copy "public\api\*.json" "out\api\" >nul 2>&1 || echo ⚠️ Copy 2 failed, continuing...

REM Stats update - hata olursa bile devam
echo Updating stats...
powershell -ExecutionPolicy Bypass -Command "try { $pools = 7; $events = 2570; $timestamp = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ'); $build = Get-Random -Maximum 9999; $stats = @{totalPools=$pools; totalEvents=$events; lastUpdated=$timestamp; buildNumber=$build; autoDeployMode=$true} | ConvertTo-Json -Compress; $stats | Out-File -FilePath 'public\api\stats.json' -Encoding UTF8; $stats | Out-File -FilePath 'out\api\stats.json' -Encoding UTF8; Write-Host \"📊 $pools pools, $events events, build #$build\" } catch { Write-Host \"📊 Stats error but continuing...\" }"
if !errorlevel! neq 0 (
    echo ⚠️ PowerShell stats failed, using simple stats...
    echo {"totalPools":7,"totalEvents":2570,"lastUpdated":"%date%","buildNumber":1234,"autoDeployMode":true} > public\api\stats.json
    copy public\api\stats.json out\api\stats.json >nul 2>&1
    set ERROR_OCCURRED=1
)

echo [CYCLE #%CYCLE%] 🚀 3/3 - DEPLOYING TO NETLIFY... (Hata olsa bile devam)
netlify deploy --prod --dir=out --message="Auto-Deploy Cycle #%CYCLE% - %date% %time%" 2>&1 || echo ⚠️ Netlify command failed
set DEPLOY_ERROR=!errorlevel!

if !DEPLOY_ERROR! == 0 (
    echo ✅ DEPLOY SUCCESS! 🎉
    echo 🌐 https://orderstake.netlify.app
) else (
    echo ⚠️ Deploy hatası: Error code !DEPLOY_ERROR!
    echo 💤 Deploy başarısız ama sistem devam ediyor...
    echo 🔧 Netlify CLI veya network sorunu olabilir
    set ERROR_OCCURRED=1
)

set /a CYCLE+=1

echo.
echo 🔄 CYCLE #%CYCLE% başlayacak...
echo ⏰ 60 saniye countdown (HER 1 DAKİKADA DEPLOY!):

for /l %%i in (60,-1,1) do (
    title 🚀 AUTO DEPLOY - Next in %%i seconds
    echo ⏰ Next auto-deploy in %%i seconds... (Ctrl+C to stop^)
    timeout /t 1 /nobreak >nul
    if %%i GTR 1 (
        for /l %%j in (1,1,50) do echo.|set /p=" "
        echo.
    )
)

title 🚀 SUPER SIMPLE Auto Deploy - Her 1 dakika DEPLOY!

REM GÜVENLIK KONTROLÜ - Döngü devam etmeli
if !ERROR_OCCURRED! neq 0 (
    echo ⚠️ Hata tespit edildi ama döngü devam ediyor...
    timeout /t 2 /nobreak >nul
)

REM DÖNGÜYÜ TEKRARLA - ASLA DURMA!
goto SIMPLE_LOOP

REM BURAYA ASLA GELİNMEMELİ - ACİL DURUM
:EMERGENCY_KEEP_ALIVE
echo.
echo 🚨 ACİL DURUM: Terminal kapanmaya çalışıyor!
echo 🔒 Terminal zorla açık tutuluyor...
echo 📝 Zaman: %date% %time%
echo 🔄 ENTER ile döngüyü yeniden başlat
pause
goto MAIN_ENTRY

REM SON ÇARE - CMD AÇIK TUT
cmd /k echo Terminal açık kaldı. 'exit' yazıp Enter'a basarak çıkabilirsiniz.