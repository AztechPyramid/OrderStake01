Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Main form - movable and resizable
$form = New-Object System.Windows.Forms.Form
$form.Text = "OrderStake Auto Deploy v1.0"
$form.Size = New-Object System.Drawing.Size(650, 550)
$form.StartPosition = "CenterScreen"
$form.BackColor = [System.Drawing.Color]::DarkBlue
$form.ForeColor = [System.Drawing.Color]::White
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::Sizable
$form.MaximizeBox = $true
$form.MinimizeBox = $true

# Title
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "ORDERSTAKE AUTO DEPLOY"
$titleLabel.Location = New-Object System.Drawing.Point(150, 15)
$titleLabel.Size = New-Object System.Drawing.Size(350, 35)
$titleLabel.Font = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::Cyan
$titleLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$form.Controls.Add($titleLabel)

# Status
$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "STOPPED - Press START button"
$statusLabel.Location = New-Object System.Drawing.Point(20, 60)
$statusLabel.Size = New-Object System.Drawing.Size(600, 30)
$statusLabel.Font = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Bold)
$statusLabel.ForeColor = [System.Drawing.Color]::Yellow
$form.Controls.Add($statusLabel)

# Info panel
$infoPanel = New-Object System.Windows.Forms.Panel
$infoPanel.Location = New-Object System.Drawing.Point(20, 100)
$infoPanel.Size = New-Object System.Drawing.Size(600, 40)
$infoPanel.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
$infoPanel.BackColor = [System.Drawing.Color]::Navy
$form.Controls.Add($infoPanel)

# Cycle counter
$cycleLabel = New-Object System.Windows.Forms.Label
$cycleLabel.Text = "Cycle: 0"
$cycleLabel.Location = New-Object System.Drawing.Point(10, 10)
$cycleLabel.Size = New-Object System.Drawing.Size(150, 20)
$cycleLabel.ForeColor = [System.Drawing.Color]::LightGreen
$cycleLabel.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$infoPanel.Controls.Add($cycleLabel)

# Countdown timer
$timeLabel = New-Object System.Windows.Forms.Label
$timeLabel.Text = "Next: --"
$timeLabel.Location = New-Object System.Drawing.Point(200, 10)
$timeLabel.Size = New-Object System.Drawing.Size(200, 20)
$timeLabel.ForeColor = [System.Drawing.Color]::LightGreen
$timeLabel.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$infoPanel.Controls.Add($timeLabel)

# Last deploy time
$lastDeployLabel = New-Object System.Windows.Forms.Label
$lastDeployLabel.Text = "Last: --"
$lastDeployLabel.Location = New-Object System.Drawing.Point(420, 10)
$lastDeployLabel.Size = New-Object System.Drawing.Size(170, 20)
$lastDeployLabel.ForeColor = [System.Drawing.Color]::LightGreen
$lastDeployLabel.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$infoPanel.Controls.Add($lastDeployLabel)

# Log box
$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Location = New-Object System.Drawing.Point(20, 150)
$logBox.Size = New-Object System.Drawing.Size(600, 300)
$logBox.Multiline = $true
$logBox.ReadOnly = $true
$logBox.BackColor = [System.Drawing.Color]::Black
$logBox.ForeColor = [System.Drawing.Color]::LightGray
$logBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$logBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
$form.Controls.Add($logBox)

# Button panel
$buttonPanel = New-Object System.Windows.Forms.Panel
$buttonPanel.Location = New-Object System.Drawing.Point(20, 460)
$buttonPanel.Size = New-Object System.Drawing.Size(600, 50)
$form.Controls.Add($buttonPanel)

# START button
$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = "START DEPLOY"
$startButton.Location = New-Object System.Drawing.Point(0, 0)
$startButton.Size = New-Object System.Drawing.Size(120, 45)
$startButton.BackColor = [System.Drawing.Color]::Green
$startButton.ForeColor = [System.Drawing.Color]::White
$startButton.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$startButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$buttonPanel.Controls.Add($startButton)

# STOP button
$stopButton = New-Object System.Windows.Forms.Button
$stopButton.Text = "STOP"
$stopButton.Location = New-Object System.Drawing.Point(130, 0)
$stopButton.Size = New-Object System.Drawing.Size(80, 45)
$stopButton.BackColor = [System.Drawing.Color]::Red
$stopButton.ForeColor = [System.Drawing.Color]::White
$stopButton.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$stopButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$stopButton.Enabled = $false
$buttonPanel.Controls.Add($stopButton)

# MANUAL button
$manualButton = New-Object System.Windows.Forms.Button
$manualButton.Text = "MANUAL DEPLOY"
$manualButton.Location = New-Object System.Drawing.Point(220, 0)
$manualButton.Size = New-Object System.Drawing.Size(120, 45)
$manualButton.BackColor = [System.Drawing.Color]::Orange
$manualButton.ForeColor = [System.Drawing.Color]::White
$manualButton.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$manualButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$buttonPanel.Controls.Add($manualButton)

# CLEAR button
$clearButton = New-Object System.Windows.Forms.Button
$clearButton.Text = "CLEAR LOG"
$clearButton.Location = New-Object System.Drawing.Point(350, 0)
$clearButton.Size = New-Object System.Drawing.Size(100, 45)
$clearButton.BackColor = [System.Drawing.Color]::Gray
$clearButton.ForeColor = [System.Drawing.Color]::White
$clearButton.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$clearButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$buttonPanel.Controls.Add($clearButton)

# EXIT button
$exitButton = New-Object System.Windows.Forms.Button
$exitButton.Text = "EXIT"
$exitButton.Location = New-Object System.Drawing.Point(460, 0)
$exitButton.Size = New-Object System.Drawing.Size(80, 45)
$exitButton.BackColor = [System.Drawing.Color]::DarkRed
$exitButton.ForeColor = [System.Drawing.Color]::White
$exitButton.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$exitButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$buttonPanel.Controls.Add($exitButton)

# Global variables
$script:isRunning = $false
$script:cycleCount = 0
$script:timer = New-Object System.Windows.Forms.Timer
$script:countdown = 0

# Log function
function Write-Log {
    param([string]$message)
    try {
        $timestamp = Get-Date -Format "HH:mm:ss"
        $logEntry = "[$timestamp] $message`r`n"
        $logBox.AppendText($logEntry)
        $logBox.SelectionStart = $logBox.Text.Length
        $logBox.ScrollToCaret()
        $form.Refresh()
    } catch {
        # Silent fail
    }
}

# Deploy function
function Start-Deploy {
    try {
        $script:cycleCount++
        $cycleLabel.Text = "Cycle: $($script:cycleCount)"
        
        Write-Log "CYCLE #$($script:cycleCount) STARTED"
        
        # Go to root directory
        $rootPath = "D:\OrderStake01"
        if (Test-Path $rootPath) {
            Set-Location $rootPath
            Write-Log "Location: $rootPath"
        } else {
            Write-Log "ERROR: Root directory not found: $rootPath"
            return
        }
        
        # 1. Indexing
        Write-Log "1/3 - Indexing (continuing from last block)..."
        if (Test-Path "indexer\indexer.js") {
            try {
                Set-Location "indexer"
                $output = & node "indexer.js" "--once" 2>&1
                Set-Location $rootPath
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "SUCCESS: Indexer completed"
                } else {
                    Write-Log "WARNING: Indexer error (continuing): $output"
                }
            } catch {
                Write-Log "ERROR: Cannot run indexer: $($_.Exception.Message)"
                Set-Location $rootPath
            }
        } else {
            Write-Log "WARNING: indexer.js not found, skipping..."
        }
        
        # 2. API update
        Write-Log "2/3 - Updating API files..."
        try {
            if (Test-Path "indexer\data") {
                Copy-Item "indexer\data\*.json" "public\api\" -ErrorAction SilentlyContinue -Force
                Write-Log "SUCCESS: Copied indexer data -> public/api"
            }
            if (Test-Path "public\api") {
                Copy-Item "public\api\*.json" "out\api\" -ErrorAction SilentlyContinue -Force
                Write-Log "SUCCESS: Copied public/api -> out/api"
            }
        } catch {
            Write-Log "WARNING: API file copy error: $($_.Exception.Message)"
        }
        
        # 3. Update stats
        Write-Log "Updating stats..."
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
            $buildNum = ($stats | ConvertFrom-Json).buildNumber
            Write-Log "SUCCESS: Stats updated (Build: $buildNum)"
        } catch {
            Write-Log "WARNING: Stats update error: $($_.Exception.Message)"
        }
        
        # 4. Netlify Deploy
        Write-Log "3/3 - NETLIFY DEPLOY..."
        try {
            $deployTime = Get-Date -Format 'HH:mm:ss'
            $deployOutput = & netlify deploy --prod --dir=out --message="Auto-Deploy Cycle #$($script:cycleCount) - $deployTime" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Log "SUCCESS: DEPLOY COMPLETED!"
                Write-Log "URL: https://orderstake.netlify.app"
                $lastDeployLabel.Text = "Last: $deployTime"
            } else {
                Write-Log "WARNING: Deploy error (continuing): $deployOutput"
            }
        } catch {
            Write-Log "ERROR: Netlify deploy error: $($_.Exception.Message)"
        }
        
        Write-Log "CYCLE #$($script:cycleCount) COMPLETED!"
        Write-Log "Next cycle in 60 seconds..."
        Write-Log "----------------------------------------"
        
    } catch {
        Write-Log "FATAL ERROR: $($_.Exception.Message)"
        Write-Log "System continues running..."
    }
}

# Timer tick event
$script:timer.add_Tick({
    if ($script:countdown -gt 0) {
        $timeLabel.Text = "Next: $($script:countdown)s"
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

# START button click
$startButton.add_Click({
    if (-not $script:isRunning) {
        $script:isRunning = $true
        $statusLabel.Text = "RUNNING - Auto deploy active (Every 60 seconds)"
        $statusLabel.ForeColor = [System.Drawing.Color]::LightGreen
        $startButton.Enabled = $false
        $stopButton.Enabled = $true
        
        Write-Log "ORDERSTAKE AUTO DEPLOY STARTED!"
        Write-Log "Auto deploy every 1 minute"
        Write-Log "This window can be moved and resized"
        Write-Log "========================================="
        
        # Start first deploy immediately
        Start-Deploy
        
        # Start countdown for next deploy
        $script:countdown = 60
        $script:timer.Interval = 1000
        $script:timer.Start()
    }
})

# STOP button click
$stopButton.add_Click({
    if ($script:isRunning) {
        $script:isRunning = $false
        $script:timer.Stop()
        $statusLabel.Text = "STOPPED - Press START button"
        $statusLabel.ForeColor = [System.Drawing.Color]::Yellow
        $startButton.Enabled = $true
        $stopButton.Enabled = $false
        $timeLabel.Text = "Next: --"
        
        Write-Log "Auto deploy STOPPED"
        Write-Log "========================================="
    }
})

# MANUAL button click
$manualButton.add_Click({
    Write-Log "MANUAL DEPLOY STARTED"
    Write-Log "========================================="
    Start-Deploy
})

# CLEAR button click
$clearButton.add_Click({
    $logBox.Clear()
    Write-Log "Log cleared"
})

# EXIT button click
$exitButton.add_Click({
    $result = [System.Windows.Forms.MessageBox]::Show(
        "Are you sure you want to exit OrderStake Auto Deploy?",
        "Exit Confirmation", 
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
    )
    
    if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
        $script:isRunning = $false
        if ($script:timer) { $script:timer.Stop() }
        Write-Log "Application closing..."
        $form.Close()
    }
})

# Form closing protection
$form.add_FormClosing({
    param($sender, $e)
    if ($script:isRunning) {
        $result = [System.Windows.Forms.MessageBox]::Show(
            "Auto Deploy is still running! Are you sure you want to close?",
            "Exit Confirmation",
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

# Initial messages
Write-Log "OrderStake Auto Deploy v1.0"
Write-Log "Windows GUI Application"
Write-Log "Ready! Press START button to begin"
Write-Log "This window is movable and resizable"
Write-Log "Use MANUAL DEPLOY for instant deploy"
Write-Log "This application NEVER closes automatically"
Write-Log "========================================="

# Show form
$form.Add_Shown({$form.Activate()})
$form.ShowDialog() | Out-Null