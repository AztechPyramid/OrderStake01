@echo off
echo ========================================
echo    OrderStake Manuel Indexer & Deploy
echo ========================================

cd /d "%~dp0\.."

echo [1/4] Running indexer...
cd indexer
node indexer.js --once
if %errorlevel% neq 0 (
    echo ERROR: Indexer failed!
    pause
    exit /b 1
)

cd ..

echo [2/4] Copying API data...
if not exist "public\api" mkdir "public\api"
if not exist "out\api" mkdir "out\api"

copy "indexer\data\*.json" "public\api\" >nul 2>&1
copy "indexer\data\*.json" "out\api\" >nul 2>&1

echo [3/4] Creating stats and index files...
powershell -Command "& {$events = (Get-Content 'public\api\staking.json' | Measure-Object -Line).Lines; $pools = (Get-Content 'public\api\pools.json' | ConvertFrom-Json | Get-Member -MemberType NoteProperty).Count; $timestamp = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ'); $buildNumber = Get-Random -Maximum 9999; $stats = @{totalEvents=$events; totalPools=$pools; lastUpdated=$timestamp; buildNumber=$buildNumber} | ConvertTo-Json -Compress; $stats | Out-File -FilePath 'public\api\stats.json' -Encoding UTF8; $stats | Out-File -FilePath 'out\api\stats.json' -Encoding UTF8; $index = @{name='OrderStake API'; version=$buildNumber; updated=$timestamp; endpoints=@{pools='./pools.json'; events='./staking.json'; stats='./stats.json'}} | ConvertTo-Json -Compress; $index | Out-File -FilePath 'public\api\index.json' -Encoding UTF8; $index | Out-File -FilePath 'out\api\index.json' -Encoding UTF8}"

echo [4/4] Building and deploying...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo    Deploy Complete!
echo ========================================
echo Local API: http://localhost:3000/api/
echo Live API: https://orderstake.netlify.app/api/
echo.

echo Checking pool count...
powershell -Command "& {$pools = (Get-Content 'out\api\pools.json' | ConvertFrom-Json | Get-Member -MemberType NoteProperty).Count; Write-Host \"Total pools: $pools\"}"

echo.
echo Press any key to exit...
pause >nul