# OrderStake Auto Deploy - EXE Builder
# Bu script PowerShell script'ini exe dosyasına çevirir

Write-Host "🔨 OrderStake Auto Deploy EXE Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ps2exe modülü var mı kontrol et
if (-not (Get-Module -ListAvailable -Name ps2exe)) {
    Write-Host "📦 ps2exe modülü yükleniyor..." -ForegroundColor Yellow
    Install-Module -Name ps2exe -Force -Scope CurrentUser
}

# EXE dosyası oluştur
$scriptPath = Join-Path $PSScriptRoot "OrderStake-AutoDeploy.ps1"
$exePath = Join-Path $PSScriptRoot "OrderStake-AutoDeploy.exe"

Write-Host "🔄 PowerShell script'i EXE'ye çevriliyor..." -ForegroundColor Yellow
Write-Host "📂 Script: $scriptPath" -ForegroundColor Gray
Write-Host "📦 EXE: $exePath" -ForegroundColor Gray

try {
    ps2exe -inputFile $scriptPath -outputFile $exePath -title "OrderStake Auto Deploy" -version "1.0.0" -iconFile $null -requireAdmin $false -winFormsDPIAware -noConsole
    
    if (Test-Path $exePath) {
        Write-Host "✅ EXE dosyası başarıyla oluşturuldu!" -ForegroundColor Green
        Write-Host "🚀 Dosya: $exePath" -ForegroundColor Green
        Write-Host ""
        Write-Host "📱 Kullanım:" -ForegroundColor Cyan
        Write-Host "   - OrderStake-AutoDeploy.exe dosyasını çift tıklayın" -ForegroundColor White
        Write-Host "   - Grafik arayüz açılacak" -ForegroundColor White
        Write-Host "   - START DEPLOY butonuna basın" -ForegroundColor White
        Write-Host "   - Uygulama ASLA kapanmaz!" -ForegroundColor White
    } else {
        Write-Host "❌ EXE dosyası oluşturulamadı!" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Hata: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Manuel olarak ps2exe yükleyip tekrar deneyin:" -ForegroundColor Yellow
    Write-Host "   Install-Module -Name ps2exe -Force" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🎯 İsterseniz PowerShell script'ini de kullanabilirsiniz:" -ForegroundColor Cyan
Write-Host "   START-ORDERSTAKE-APP.bat dosyasını çift tıklayın" -ForegroundColor White

Read-Host "Press Enter to exit"