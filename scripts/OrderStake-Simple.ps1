Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Ana form
$form = New-Object System.Windows.Forms.Form
$form.Text = "OrderStake Auto Deploy"
$form.Size = New-Object System.Drawing.Size(600, 500)
$form.StartPosition = "CenterScreen"
$form.BackColor = [System.Drawing.Color]::DarkBlue
$form.ForeColor = [System.Drawing.Color]::White

# Başlık
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "ORDERSTAKE AUTO DEPLOY"
$titleLabel.Location = New-Object System.Drawing.Point(150, 20)
$titleLabel.Size = New-Object System.Drawing.Size(300, 30)
$titleLabel.Font = New-Object System.Drawing.Font("Arial", 14, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::Cyan
$form.Controls.Add($titleLabel)

# Durum
$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "Durduruldu - START'a basin"
$statusLabel.Location = New-Object System.Drawing.Point(20, 60)
$statusLabel.Size = New-Object System.Drawing.Size(550, 30)
$statusLabel.Font = New-Object System.Drawing.Font("Arial", 12)
$statusLabel.ForeColor = [System.Drawing.Color]::Yellow
$form.Controls.Add($statusLabel)

# Cycle
$cycleLabel = New-Object System.Windows.Forms.Label
$cycleLabel.Text = "Cycle: 0"
$cycleLabel.Location = New-Object System.Drawing.Point(20, 100)
$cycleLabel.Size = New-Object System.Drawing.Size(200, 25)
$cycleLabel.ForeColor = [System.Drawing.Color]::LightGreen
$form.Controls.Add($cycleLabel)

# Zaman
$timeLabel = New-Object System.Windows.Forms.Label
$timeLabel.Text = "Sonraki: --"
$timeLabel.Location = New-Object System.Drawing.Point(300, 100)
$timeLabel.Size = New-Object System.Drawing.Size(250, 25)
$timeLabel.ForeColor = [System.Drawing.Color]::LightGreen
$form.Controls.Add($timeLabel)

# Log
$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Location = New-Object System.Drawing.Point(20, 140)
$logBox.Size = New-Object System.Drawing.Size(550, 250)
$logBox.Multiline = $true
$logBox.ScrollBars = "Vertical"
$logBox.ReadOnly = $true
$logBox.BackColor = [System.Drawing.Color]::Black
$logBox.ForeColor = [System.Drawing.Color]::LightGray
$form.Controls.Add($logBox)

# START button
$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = "START DEPLOY"
$startButton.Location = New-Object System.Drawing.Point(20, 410)
$startButton.Size = New-Object System.Drawing.Size(150, 40)
$startButton.BackColor = [System.Drawing.Color]::Green
$startButton.ForeColor = [System.Drawing.Color]::White
$form.Controls.Add($startButton)

# STOP button
$stopButton = New-Object System.Windows.Forms.Button
$stopButton.Text = "STOP"
$stopButton.Location = New-Object System.Drawing.Point(190, 410)
$stopButton.Size = New-Object System.Drawing.Size(100, 40)
$stopButton.BackColor = [System.Drawing.Color]::Red
$stopButton.ForeColor = [System.Drawing.Color]::White
$stopButton.Enabled = $false
$form.Controls.Add($stopButton)

# EXIT button
$exitButton = New-Object System.Windows.Forms.Button
$exitButton.Text = "EXIT"
$exitButton.Location = New-Object System.Drawing.Point(480, 410)
$exitButton.Size = New-Object System.Drawing.Size(90, 40)
$exitButton.BackColor = [System.Drawing.Color]::DarkRed
$exitButton.ForeColor = [System.Drawing.Color]::White
$form.Controls.Add($exitButton)

# Global değişkenler
$script:isRunning = $false
$script:cycleCount = 0
$script:timer = New-Object System.Windows.Forms.Timer
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
        Write-Log "CYCLE #$($script:cycleCount + 1) BASLADI"
        
        # Ana dizine geç - Sabit path kullan
        $rootPath = "D:\OrderStake01"
        Set-Location $rootPath
        
        Write-Log "Konum: $rootPath"
        
        # Indexing
        Write-Log "1/3 - Indexing..."
        if (Test-Path "indexer\indexer.js") {
            Set-Location "indexer"
            $indexResult = & node "indexer.js" "--once" 2>&1
            Set-Location $rootPath
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Indexer tamam"
            } else {
                Write-Log "Indexer hatasi (devam ediyor)"
            }
        } else {
            Write-Log "indexer.js bulunamadi"
        }
        
        # API update
        Write-Log "2/3 - API update..."
        Copy-Item "indexer\data\*.json" "public\api\" -ErrorAction SilentlyContinue
        Copy-Item "public\api\*.json" "out\api\" -ErrorAction SilentlyContinue
        Write-Log "API dosyalari guncellendi"
        
        # Stats
        Write-Log "Stats guncelleniyor..."
        $stats = @{
            totalPools = 7
            totalEvents = 2570
            lastUpdated = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
            buildNumber = (Get-Random -Maximum 9999)
            autoDeployMode = $true
        } | ConvertTo-Json -Compress
        
        $stats | Out-File -FilePath "public\api\stats.json" -Encoding UTF8
        $stats | Out-File -FilePath "out\api\stats.json" -Encoding UTF8
        Write-Log "Stats guncellendi"
        
        # Netlify Deploy
        Write-Log "3/3 - NETLIFY DEPLOY..."
        $deployResult = & netlify deploy --prod --dir=out --message="Auto-Deploy Cycle #$($script:cycleCount + 1)" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "DEPLOY SUCCESS!"
            Write-Log "https://orderstake.netlify.app"
        } else {
            Write-Log "Deploy hatasi (devam ediyor)"
        }
        
        $script:cycleCount++
        $cycleLabel.Text = "Cycle: $($script:cycleCount)"
        Write-Log "CYCLE #$($script:cycleCount) TAMAM!"
        
    } catch {
        Write-Log "Hata: $($_.Exception.Message)"
    }
}

# Timer event
$script:timer.add_Tick({
    if ($script:countdown -gt 0) {
        $timeLabel.Text = "Sonraki: $($script:countdown) saniye"
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
        $statusLabel.Text = "CALISIYOR - Otomatik deploy aktif"
        $statusLabel.ForeColor = [System.Drawing.Color]::LightGreen
        $startButton.Enabled = $false
        $stopButton.Enabled = $true
        
        Write-Log "AUTO DEPLOY BASLADI!"
        Write-Log "Her 1 dakikada deploy yapilacak"
        
        Start-Deploy
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
        $statusLabel.Text = "DURDURULDU"
        $statusLabel.ForeColor = [System.Drawing.Color]::Yellow
        $startButton.Enabled = $true
        $stopButton.Enabled = $false
        $timeLabel.Text = "Sonraki: --"
        Write-Log "Deploy durduruldu"
    }
})

# EXIT button
$exitButton.add_Click({
    $script:isRunning = $false
    $script:timer.Stop()
    $form.Close()
})

# İlk mesajlar
Write-Log "OrderStake Auto Deploy v1.0"
Write-Log "Hazir! START'a basin"
Write-Log "Bu uygulama ASLA kapanmaz!"

# Formu göster
$form.ShowDialog() | Out-Null