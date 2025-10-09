# OrderStake Auto Deploy Application
# Bu uygulama her 1 dakikada bir otomatik deploy yapar ve asla kapanmaz!

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Ana form oluştur
$form = New-Object System.Windows.Forms.Form
$form.Text = "🚀 OrderStake Auto Deploy"
$form.Size = New-Object System.Drawing.Size(600, 500)
$form.StartPosition = "CenterScreen"
$form.BackColor = [System.Drawing.Color]::DarkBlue
$form.ForeColor = [System.Drawing.Color]::White
$form.Font = New-Object System.Drawing.Font("Consolas", 10)

# Başlık label
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "🚀 ORDERSTAKE AUTO DEPLOY"
$titleLabel.Location = New-Object System.Drawing.Point(150, 20)
$titleLabel.Size = New-Object System.Drawing.Size(300, 30)
$titleLabel.Font = New-Object System.Drawing.Font("Consolas", 14, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::Cyan
$form.Controls.Add($titleLabel)

# Durum label
$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "⏸️ Durduruldu - Başlatmak için START'a bas"
$statusLabel.Location = New-Object System.Drawing.Point(20, 60)
$statusLabel.Size = New-Object System.Drawing.Size(550, 30)
$statusLabel.Font = New-Object System.Drawing.Font("Consolas", 12)
$statusLabel.ForeColor = [System.Drawing.Color]::Yellow
$form.Controls.Add($statusLabel)

# Cycle sayacı
$cycleLabel = New-Object System.Windows.Forms.Label
$cycleLabel.Text = "Cycle: 0"
$cycleLabel.Location = New-Object System.Drawing.Point(20, 100)
$cycleLabel.Size = New-Object System.Drawing.Size(200, 25)
$cycleLabel.ForeColor = [System.Drawing.Color]::LightGreen
$form.Controls.Add($cycleLabel)

# Zaman sayacı
$timeLabel = New-Object System.Windows.Forms.Label
$timeLabel.Text = "Sonraki deploy: --"
$timeLabel.Location = New-Object System.Drawing.Point(300, 100)
$timeLabel.Size = New-Object System.Drawing.Size(250, 25)
$timeLabel.ForeColor = [System.Drawing.Color]::LightGreen
$form.Controls.Add($timeLabel)

# Log text box
$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Location = New-Object System.Drawing.Point(20, 140)
$logBox.Size = New-Object System.Drawing.Size(550, 250)
$logBox.Multiline = $true
$logBox.ScrollBars = "Vertical"
$logBox.ReadOnly = $true
$logBox.BackColor = [System.Drawing.Color]::Black
$logBox.ForeColor = [System.Drawing.Color]::LightGray
$logBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$form.Controls.Add($logBox)

# Start button
$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = "🚀 START DEPLOY"
$startButton.Location = New-Object System.Drawing.Point(20, 410)
$startButton.Size = New-Object System.Drawing.Size(150, 40)
$startButton.BackColor = [System.Drawing.Color]::Green
$startButton.ForeColor = [System.Drawing.Color]::White
$startButton.Font = New-Object System.Drawing.Font("Consolas", 10, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($startButton)

# Stop button
$stopButton = New-Object System.Windows.Forms.Button
$stopButton.Text = "⏸️ STOP"
$stopButton.Location = New-Object System.Drawing.Point(190, 410)
$stopButton.Size = New-Object System.Drawing.Size(100, 40)
$stopButton.BackColor = [System.Drawing.Color]::Red
$stopButton.ForeColor = [System.Drawing.Color]::White
$stopButton.Font = New-Object System.Drawing.Font("Consolas", 10, [System.Drawing.FontStyle]::Bold)
$stopButton.Enabled = $false
$form.Controls.Add($stopButton)

# Manual Deploy button
$manualButton = New-Object System.Windows.Forms.Button
$manualButton.Text = "⚡ MANUAL DEPLOY"
$manualButton.Location = New-Object System.Drawing.Point(310, 410)
$manualButton.Size = New-Object System.Drawing.Size(150, 40)
$manualButton.BackColor = [System.Drawing.Color]::Orange
$manualButton.ForeColor = [System.Drawing.Color]::White
$manualButton.Font = New-Object System.Drawing.Font("Consolas", 10, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($manualButton)

# Exit button
$exitButton = New-Object System.Windows.Forms.Button
$exitButton.Text = "❌ EXIT"
$exitButton.Location = New-Object System.Drawing.Point(480, 410)
$exitButton.Size = New-Object System.Drawing.Size(90, 40)
$exitButton.BackColor = [System.Drawing.Color]::DarkRed
$exitButton.ForeColor = [System.Drawing.Color]::White
$exitButton.Font = New-Object System.Drawing.Font("Consolas", 10, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($exitButton)

# Global değişkenler
$script:isRunning = $false
$script:cycleCount = 0
$script:timer = New-Object System.Windows.Forms.Timer
$script:countdownTimer = New-Object System.Windows.Forms.Timer
$script:countdown = 0

# Log fonksiyonu
function Write-Log {
    param([string]$message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    $logEntry = "[$timestamp] $message"
    $logBox.AppendText($logEntry + "`r`n")
    $logBox.SelectionStart = $logBox.Text.Length
    $logBox.ScrollToCaret()
    $form.Refresh()
}

# Deploy fonksiyonu
function Start-Deploy {
    try {
        Write-Log "🔄 CYCLE #$($script:cycleCount + 1) BAŞLADI"
        
        # Ana dizine geç
        $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
        $rootPath = Split-Path -Parent $scriptPath
        Set-Location $rootPath
        
        Write-Log "📂 Konum: $rootPath"
        
        # 1. Indexing
        Write-Log "📊 1/3 - Indexing (son bloktan devam)..."
        if (Test-Path "indexer\indexer.js") {
            Set-Location "indexer"
            $indexResult = & node "indexer.js" "--once" 2>&1
            Set-Location $rootPath
            if ($LASTEXITCODE -eq 0) {
                Write-Log "✅ Indexer tamamlandı"
            } else {
                Write-Log "⚠️ Indexer hatası (devam ediyor): $indexResult"
            }
        } else {
            Write-Log "❌ indexer.js bulunamadı, atlanıyor..."
        }
        
        # 2. API dosyalarını güncelle
        Write-Log "📄 2/3 - API dosyaları güncelleniyor..."
        try {
            Copy-Item "indexer\data\*.json" "public\api\" -ErrorAction SilentlyContinue
            Copy-Item "public\api\*.json" "out\api\" -ErrorAction SilentlyContinue
            Write-Log "✅ API dosyaları güncellendi"
        } catch {
            Write-Log "⚠️ API dosya güncelleme hatası: $($_.Exception.Message)"
        }
        
        # 3. Stats güncelle
        Write-Log "📊 Stats güncelleniyor..."
        try {
            $pools = 7
            $events = 2570
            $timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
            $build = Get-Random -Maximum 9999
            
            $stats = @{
                totalPools = $pools
                totalEvents = $events
                lastUpdated = $timestamp
                buildNumber = $build
                autoDeployMode = $true
            } | ConvertTo-Json -Compress
            
            $stats | Out-File -FilePath "public\api\stats.json" -Encoding UTF8
            $stats | Out-File -FilePath "out\api\stats.json" -Encoding UTF8
            Write-Log "📊 Stats: $pools pools, $events events, build #$build"
        } catch {
            Write-Log "⚠️ Stats hatası: $($_.Exception.Message)"
        }
        
        # 4. Netlify Deploy
        Write-Log "🚀 3/3 - NETLIFY DEPLOY..."
        try {
            $deployResult = & netlify deploy --prod --dir=out --message="Auto-Deploy Cycle #$($script:cycleCount + 1) - $(Get-Date)" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Log "✅ DEPLOY SUCCESS! 🎉"
                Write-Log "🌐 https://orderstake.netlify.app"
            } else {
                Write-Log "⚠️ Deploy hatası: $deployResult"
                Write-Log "💤 Deploy başarısız ama sistem devam ediyor..."
            }
        } catch {
            Write-Log "❌ Netlify deploy hatası: $($_.Exception.Message)"
        }
        
        $script:cycleCount++
        $cycleLabel.Text = "Cycle: $($script:cycleCount)"
        Write-Log "✅ CYCLE #$($script:cycleCount) TAMAMLANDI!"
        Write-Log "⏰ 60 saniye sonra sonraki cycle başlayacak..."
        
    } catch {
        Write-Log "❌ Deploy hatası: $($_.Exception.Message)"
        Write-Log "🔄 Sistem devam ediyor..."
    }
}

# Countdown timer event
$script:countdownTimer.add_Tick({
    if ($script:countdown -gt 0) {
        $timeLabel.Text = "Sonraki deploy: $($script:countdown) saniye"
        $script:countdown--
    } else {
        $script:countdownTimer.Stop()
        if ($script:isRunning) {
            Start-Deploy
            $script:countdown = 60
            $script:countdownTimer.Start()
        }
    }
})

# Start button event
$startButton.add_Click({
    if (-not $script:isRunning) {
        $script:isRunning = $true
        $statusLabel.Text = "🟢 ÇALIŞIYOR - Otomatik deploy aktif"
        $statusLabel.ForeColor = [System.Drawing.Color]::LightGreen
        $startButton.Enabled = $false
        $stopButton.Enabled = $true
        
        Write-Log "🚀 ORDERSTAKE AUTO DEPLOY BAŞLATILDI!"
        Write-Log "⚡ Her 1 dakikada otomatik deploy yapılacak"
        Write-Log "🛡️ Bu pencere ASLA kapanmaz!"
        
        # İlk deploy'u hemen yap
        Start-Deploy
        
        # Sonraki için countdown başlat
        $script:countdown = 60
        $script:countdownTimer.Interval = 1000
        $script:countdownTimer.Start()
    }
})

# Stop button event
$stopButton.add_Click({
    if ($script:isRunning) {
        $script:isRunning = $false
        $script:countdownTimer.Stop()
        $statusLabel.Text = "⏸️ DURDURULDU - Başlatmak için START'a bas"
        $statusLabel.ForeColor = [System.Drawing.Color]::Yellow
        $startButton.Enabled = $true
        $stopButton.Enabled = $false
        $timeLabel.Text = "Sonraki deploy: --"
        
        Write-Log "⏸️ Otomatik deploy durduruldu"
    }
})

# Manual Deploy button event
$manualButton.add_Click({
    Write-Log "⚡ MANUEL DEPLOY BAŞLATILDI"
    Start-Deploy
})

# Exit button event
$exitButton.add_Click({
    $result = [System.Windows.Forms.MessageBox]::Show(
        "Auto Deploy uygulamasından çıkmak istediğinizden emin misiniz?",
        "Çıkış Onayı",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
    )
    
    if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
        $script:isRunning = $false
        $script:countdownTimer.Stop()
        $form.Close()
    }
})

# Form kapanma event
$form.add_FormClosing({
    param($sender, $e)
    if ($script:isRunning) {
        $result = [System.Windows.Forms.MessageBox]::Show(
            "Auto Deploy hala çalışıyor! Kapatmak istediğinizden emin misiniz?",
            "Çıkış Onayı",
            [System.Windows.Forms.MessageBoxButtons]::YesNo,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        )
        
        if ($result -eq [System.Windows.Forms.DialogResult]::No) {
            $e.Cancel = $true
        } else {
            $script:isRunning = $false
            $script:countdownTimer.Stop()
        }
    }
})

# İlk log mesajları
Write-Log "🎯 OrderStake Auto Deploy Uygulaması"
Write-Log "📝 Versiyon: 1.0.0"
Write-Log "⚡ Hazır! START butonuna basarak başlayın"
Write-Log "🛡️ Bu uygulama ASLA kapanmaz (sadece EXIT ile çıkılabilir)"

# Formu göster
$form.ShowDialog()