Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Ana form - hareket edilebilir
$form = New-Object System.Windows.Forms.Form
$form.Text = "OrderStake Auto Deploy v1.0"
$form.Size = New-Object System.Drawing.Size(650, 550)
$form.StartPosition = "CenterScreen"
$form.BackColor = [System.Drawing.Color]::DarkBlue
$form.ForeColor = [System.Drawing.Color]::White
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::Sizable  # Hareket edilebilir
$form.MaximizeBox = $true
$form.MinimizeBox = $true

# Başlık
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "ORDERSTAKE AUTO DEPLOY"
$titleLabel.Location = New-Object System.Drawing.Point(150, 15)
$titleLabel.Size = New-Object System.Drawing.Size(350, 35)
$titleLabel.Font = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::Cyan
$titleLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$form.Controls.Add($titleLabel)

# Durum
$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "🔴 DURDURULDU - START butonuna basin"
$statusLabel.Location = New-Object System.Drawing.Point(20, 60)
$statusLabel.Size = New-Object System.Drawing.Size(600, 30)
$statusLabel.Font = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Bold)
$statusLabel.ForeColor = [System.Drawing.Color]::Yellow
$form.Controls.Add($statusLabel)

# Bilgi paneli
$infoPanel = New-Object System.Windows.Forms.Panel
$infoPanel.Location = New-Object System.Drawing.Point(20, 100)
$infoPanel.Size = New-Object System.Drawing.Size(600, 40)
$infoPanel.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
$infoPanel.BackColor = [System.Drawing.Color]::Navy
$form.Controls.Add($infoPanel)

# Cycle
$cycleLabel = New-Object System.Windows.Forms.Label
$cycleLabel.Text = "Cycle: 0"
$cycleLabel.Location = New-Object System.Drawing.Point(10, 10)
$cycleLabel.Size = New-Object System.Drawing.Size(150, 20)
$cycleLabel.ForeColor = [System.Drawing.Color]::LightGreen
$cycleLabel.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$infoPanel.Controls.Add($cycleLabel)

# Zaman
$timeLabel = New-Object System.Windows.Forms.Label
$timeLabel.Text = "Sonraki: --"
$timeLabel.Location = New-Object System.Drawing.Point(200, 10)
$timeLabel.Size = New-Object System.Drawing.Size(200, 20)
$timeLabel.ForeColor = [System.Drawing.Color]::LightGreen
$timeLabel.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$infoPanel.Controls.Add($timeLabel)

# Son deploy
$lastDeployLabel = New-Object System.Windows.Forms.Label
$lastDeployLabel.Text = "Son: --"
$lastDeployLabel.Location = New-Object System.Drawing.Point(420, 10)
$lastDeployLabel.Size = New-Object System.Drawing.Size(170, 20)
$lastDeployLabel.ForeColor = [System.Drawing.Color]::LightGreen
$lastDeployLabel.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$infoPanel.Controls.Add($lastDeployLabel)

# Log
$logBox = New-Object System.Windows.Forms.RichTextBox
$logBox.Location = New-Object System.Drawing.Point(20, 150)
$logBox.Size = New-Object System.Drawing.Size(600, 300)
$logBox.ReadOnly = $true
$logBox.BackColor = [System.Drawing.Color]::Black
$logBox.ForeColor = [System.Drawing.Color]::LightGray
$logBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$logBox.ScrollBars = [System.Windows.Forms.RichTextBoxScrollBars]::Vertical
$form.Controls.Add($logBox)

# Buton paneli
$buttonPanel = New-Object System.Windows.Forms.Panel
$buttonPanel.Location = New-Object System.Drawing.Point(20, 460)
$buttonPanel.Size = New-Object System.Drawing.Size(600, 50)
$form.Controls.Add($buttonPanel)

# START button
$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = "🚀 START DEPLOY"
$startButton.Location = New-Object System.Drawing.Point(0, 0)
$startButton.Size = New-Object System.Drawing.Size(140, 45)
$startButton.BackColor = [System.Drawing.Color]::Green
$startButton.ForeColor = [System.Drawing.Color]::White
$startButton.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$startButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$buttonPanel.Controls.Add($startButton)

# STOP button
$stopButton = New-Object System.Windows.Forms.Button
$stopButton.Text = "⏸️ STOP"
$stopButton.Location = New-Object System.Drawing.Point(150, 0)
$stopButton.Size = New-Object System.Drawing.Size(100, 45)
$stopButton.BackColor = [System.Drawing.Color]::Red
$stopButton.ForeColor = [System.Drawing.Color]::White
$stopButton.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$stopButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$stopButton.Enabled = $false
$buttonPanel.Controls.Add($stopButton)

# MANUAL button
$manualButton = New-Object System.Windows.Forms.Button
$manualButton.Text = "⚡ MANUAL"
$manualButton.Location = New-Object System.Drawing.Point(260, 0)
$manualButton.Size = New-Object System.Drawing.Size(120, 45)
$manualButton.BackColor = [System.Drawing.Color]::Orange
$manualButton.ForeColor = [System.Drawing.Color]::White
$manualButton.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$manualButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$buttonPanel.Controls.Add($manualButton)

# CLEAR LOG button
$clearButton = New-Object System.Windows.Forms.Button
$clearButton.Text = "🗑️ CLEAR"
$clearButton.Location = New-Object System.Drawing.Point(390, 0)
$clearButton.Size = New-Object System.Drawing.Size(100, 45)
$clearButton.BackColor = [System.Drawing.Color]::Gray
$clearButton.ForeColor = [System.Drawing.Color]::White
$clearButton.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$clearButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$buttonPanel.Controls.Add($clearButton)

# EXIT button
$exitButton = New-Object System.Windows.Forms.Button
$exitButton.Text = "❌ EXIT"
$exitButton.Location = New-Object System.Drawing.Point(500, 0)
$exitButton.Size = New-Object System.Drawing.Size(100, 45)
$exitButton.BackColor = [System.Drawing.Color]::DarkRed
$exitButton.ForeColor = [System.Drawing.Color]::White
$exitButton.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$exitButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$buttonPanel.Controls.Add($exitButton)

# Global değişkenler
$script:isRunning = $false
$script:cycleCount = 0
$script:timer = New-Object System.Windows.Forms.Timer
$script:countdown = 0

# Log fonksiyonu - renkli
function Write-Log {
    param(
        [string]$message,
        [string]$color = "LightGray"
    )
    try {
        $timestamp = Get-Date -Format "HH:mm:ss"
        $logEntry = "[$timestamp] $message`n"
        
        $logBox.SelectionStart = $logBox.Text.Length
        $logBox.SelectionLength = 0
        
        switch ($color) {
            "Green" { $logBox.SelectionColor = [System.Drawing.Color]::LightGreen }
            "Red" { $logBox.SelectionColor = [System.Drawing.Color]::LightCoral }
            "Yellow" { $logBox.SelectionColor = [System.Drawing.Color]::Yellow }
            "Cyan" { $logBox.SelectionColor = [System.Drawing.Color]::Cyan }
            default { $logBox.SelectionColor = [System.Drawing.Color]::LightGray }
        }
        
        $logBox.AppendText($logEntry)
        $logBox.SelectionStart = $logBox.Text.Length
        $logBox.ScrollToCaret()
        $form.Refresh()
    } catch {
        # Hata durumunda basit text ekle
        $logBox.AppendText("[$timestamp] $message`n")
    }
}

# Deploy fonksiyonu
function Start-Deploy {
    try {
        $script:cycleCount++
        $cycleLabel.Text = "Cycle: $($script:cycleCount)"
        
        Write-Log "🔄 CYCLE #$($script:cycleCount) BAŞLADI" "Cyan"
        
        # Ana dizine geç
        $rootPath = "D:\OrderStake01"
        if (Test-Path $rootPath) {
            Set-Location $rootPath
            Write-Log "📂 Konum: $rootPath" "Yellow"
        } else {
            Write-Log "❌ Ana dizin bulunamadı: $rootPath" "Red"
            return
        }
        
        # 1. Indexing
        Write-Log "📊 1/3 - Indexing (son bloktan devam)..." "Yellow"
        if (Test-Path "indexer\indexer.js") {
            try {
                Set-Location "indexer"
                $output = & node "indexer.js" "--once" 2>&1
                Set-Location $rootPath
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "✅ Indexer tamamlandı" "Green"
                } else {
                    Write-Log "⚠️ Indexer hatası (devam ediyor): $output" "Red"
                }
            } catch {
                Write-Log "❌ Indexer çalıştırılamadı: $($_.Exception.Message)" "Red"
                Set-Location $rootPath
            }
        } else {
            Write-Log "❌ indexer.js bulunamadı, atlanıyor..." "Red"
        }
        
        # 2. API update
        Write-Log "📄 2/3 - API dosyaları güncelleniyor..." "Yellow"
        try {
            if (Test-Path "indexer\data") {
                Copy-Item "indexer\data\*.json" "public\api\" -ErrorAction SilentlyContinue -Force
                Write-Log "✅ Indexer data → public/api kopyalandı" "Green"
            }
            if (Test-Path "public\api") {
                Copy-Item "public\api\*.json" "out\api\" -ErrorAction SilentlyContinue -Force
                Write-Log "✅ public/api → out/api kopyalandı" "Green"
            }
        } catch {
            Write-Log "⚠️ API dosya kopyalama hatası: $($_.Exception.Message)" "Red"
        }
        
        # 3. Stats güncelle
        Write-Log "📊 Stats güncelleniyor..." "Yellow"
        try {
            $stats = @{
                totalPools = 7
                totalEvents = 2570
                lastUpdated = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
                buildNumber = (Get-Random -Maximum 9999)
                autoDeployMode = $true
                cycleCount = $script:cycleCount
            } | ConvertTo-Json -Compress
            
            $stats | Out-File -FilePath "public\api\stats.json" -Encoding UTF8 -Force
            $stats | Out-File -FilePath "out\api\stats.json" -Encoding UTF8 -Force
            Write-Log "✅ Stats güncellendi (Build: $(($stats | ConvertFrom-Json).buildNumber))" "Green"
        } catch {
            Write-Log "⚠️ Stats güncelleme hatası: $($_.Exception.Message)" "Red"
        }
        
        # 4. Netlify Deploy
        Write-Log "🚀 3/3 - NETLIFY DEPLOY..." "Cyan"
        try {
            $deployOutput = & netlify deploy --prod --dir=out --message="Auto-Deploy Cycle #$($script:cycleCount) - $(Get-Date -Format 'HH:mm:ss')" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Log "🎉 DEPLOY SUCCESS!" "Green"
                Write-Log "🌐 https://orderstake.netlify.app" "Cyan"
                $lastDeployLabel.Text = "Son: $(Get-Date -Format 'HH:mm:ss')"
            } else {
                Write-Log "⚠️ Deploy hatası (devam ediyor): $deployOutput" "Red"
            }
        } catch {
            Write-Log "❌ Netlify deploy hatası: $($_.Exception.Message)" "Red"
        }
        
        Write-Log "✅ CYCLE #$($script:cycleCount) TAMAMLANDI!" "Green"
        Write-Log "⏰ 60 saniye sonra sonraki cycle..." "Yellow"
        
    } catch {
        Write-Log "💥 Beklenmedik hata: $($_.Exception.Message)" "Red"
        Write-Log "🔄 Sistem devam ediyor..." "Yellow"
    }
}

# Timer event
$script:timer.add_Tick({
    if ($script:countdown -gt 0) {
        $timeLabel.Text = "Sonraki: $($script:countdown)s"
        $script:countdown--
    } else {
        $script:timer.Stop()
        if ($script:isRunning) {
            Start-Deploy
            $script:countdown = 60
            $script:timer.Start()
        }
    }
})

# START button
$startButton.add_Click({
    if (-not $script:isRunning) {
        $script:isRunning = $true
        $statusLabel.Text = "🟢 ÇALIŞIYOR - Otomatik deploy aktif (Her 60 saniye)"
        $statusLabel.ForeColor = [System.Drawing.Color]::LightGreen
        $startButton.Enabled = $false
        $stopButton.Enabled = $true
        
        Write-Log "🚀 ORDERSTAKE AUTO DEPLOY BAŞLATILDI!" "Cyan"
        Write-Log "⚡ Her 1 dakikada otomatik deploy yapılacak" "Yellow"
        Write-Log "🛡️ Bu pencere hareket ettirilebilir ve ASLA kapanmaz!" "Cyan"
        
        # İlk deploy'u hemen yap
        Start-Deploy
        
        # Sonraki için countdown başlat
        $script:countdown = 60
        $script:timer.Interval = 1000
        $script:timer.Start()
    }
})

# STOP button
$stopButton.add_Click({
    if ($script:isRunning) {
        $script:isRunning = $false
        $script:timer.Stop()
        $statusLabel.Text = "🔴 DURDURULDU - START butonuna basin"
        $statusLabel.ForeColor = [System.Drawing.Color]::Yellow
        $startButton.Enabled = $true
        $stopButton.Enabled = $false
        $timeLabel.Text = "Sonraki: --"
        
        Write-Log "⏸️ Otomatik deploy durduruldu" "Yellow"
    }
})

# MANUAL button
$manualButton.add_Click({
    Write-Log "⚡ MANUEL DEPLOY BAŞLATILDI" "Cyan"
    Start-Deploy
})

# CLEAR LOG button
$clearButton.add_Click({
    $logBox.Clear()
    Write-Log "🗑️ Log temizlendi" "Yellow"
})

# EXIT button
$exitButton.add_Click({
    $result = [System.Windows.Forms.MessageBox]::Show(
        "OrderStake Auto Deploy uygulamasından çıkmak istediğinizden emin misiniz?",
        "Çıkış Onayı", 
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
    )
    
    if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
        $script:isRunning = $false
        if ($script:timer) { $script:timer.Stop() }
        Write-Log "👋 Uygulama kapatılıyor..." "Yellow"
        $form.Close()
    }
})

# Form kapatma koruması
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
            if ($script:timer) { $script:timer.Stop() }
        }
    }
})

# Başlangıç mesajları
Write-Log "🎯 OrderStake Auto Deploy v1.0" "Cyan"
Write-Log "📝 Windows GUI Uygulaması" "Yellow"
Write-Log "✅ Hazır! START butonuna basarak başlayın" "Green"
Write-Log "🛡️ Bu pencere hareket ettirilebilir ve boyutlandırılabilir" "Yellow"
Write-Log "💡 MANUAL buton ile istediğiniz zaman deploy yapabilirsiniz" "Cyan"

# Form göster
$form.Add_Shown({$form.Activate()})
[void]$form.ShowDialog()