param(
    [switch]$Start,
    [switch]$Stop,
    [switch]$Status,
    [int]$Interval = 60
)

# Renkli output fonksiyonları
function Write-ColorText {
    param(
        [string]$Text,
        [string]$Color = "White"
    )
    switch ($Color) {
        "Red" { Write-Host $Text -ForegroundColor Red }
        "Green" { Write-Host $Text -ForegroundColor Green }
        "Yellow" { Write-Host $Text -ForegroundColor Yellow }
        "Cyan" { Write-Host $Text -ForegroundColor Cyan }
        "Magenta" { Write-Host $Text -ForegroundColor Magenta }
        default { Write-Host $Text -ForegroundColor White }
    }
}

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-ColorText "============================================" "Cyan"
    Write-ColorText "  $Title" "Cyan"
    Write-ColorText "============================================" "Cyan"
}

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    $timestamp = Get-Date -Format "HH:mm:ss"
    switch ($Level) {
        "ERROR" { Write-ColorText "[$timestamp] ERROR: $Message" "Red" }
        "WARN" { Write-ColorText "[$timestamp] WARN:  $Message" "Yellow" }
        "SUCCESS" { Write-ColorText "[$timestamp] OK:    $Message" "Green" }
        default { Write-ColorText "[$timestamp] INFO:  $Message" "White" }
    }
}

# Global değişkenler
$script:isRunning = $false
$script:cycleCount = 0
$script:startTime = Get-Date

# Başlık göster
Clear-Host
Write-Header "ORDERSTAKE AUTO DEPLOY v2.0"
Write-ColorText "Terminal Based - No GUI Dependencies" "Yellow"
Write-ColorText "Repository: https://github.com/AztechPyramid/OrderStake01" "Cyan"
Write-Host ""

# Deploy fonksiyonu
function Start-Deploy {
    param([bool]$IsManual = $false)
    
    try {
        $script:cycleCount++
        
        if ($IsManual) {
            Write-Header "MANUAL DEPLOY #$($script:cycleCount)"
        } else {
            Write-Header "AUTO DEPLOY CYCLE #$($script:cycleCount)"
        }
        
        $deployStart = Get-Date
        
        # Ana dizine geç
        $rootPath = "D:\OrderStake01"
        if (Test-Path $rootPath) {
            Set-Location $rootPath
            Write-Log "Working directory: $rootPath"
        } else {
            Write-Log "Root directory not found: $rootPath" "ERROR"
            return $false
        }
        
        # 1. Indexing
        Write-Log "Step 1/4 - Running indexer (continuing from last block)..."
        if (Test-Path "indexer\indexer.js") {
            try {
                Set-Location "indexer"
                
                # Son blok bilgisini göster
                if (Test-Path "data\latest-block.json") {
                    $lastBlock = Get-Content "data\latest-block.json" | ConvertFrom-Json
                    Write-Log "Last processed blocks: $($lastBlock | ConvertTo-Json -Compress)"
                }
                
                Write-Log "Executing: node indexer.js --once"
                $indexOutput = & node "indexer.js" "--once" 2>&1
                Set-Location $rootPath
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "Indexer completed successfully" "SUCCESS"
                    
                    # Yeni blok bilgisini göster
                    if (Test-Path "indexer\data\latest-block.json") {
                        $newBlock = Get-Content "indexer\data\latest-block.json" | ConvertFrom-Json
                        Write-Log "Updated blocks: $($newBlock | ConvertTo-Json -Compress)"
                    }
                } else {
                    Write-Log "Indexer error (exit code: $LASTEXITCODE) but continuing..." "WARN"
                    Write-Log "Output: $indexOutput" "WARN"
                }
            } catch {
                Write-Log "Failed to run indexer: $($_.Exception.Message)" "ERROR"
                Set-Location $rootPath
            }
        } else {
            Write-Log "indexer.js not found, skipping indexing step" "WARN"
        }
        
        # 2. API Files Update
        Write-Log "Step 2/4 - Updating API files..."
        try {
            # Klasörleri oluştur
            if (-not (Test-Path "public\api")) { New-Item -Path "public\api" -ItemType Directory -Force | Out-Null }
            if (-not (Test-Path "out\api")) { New-Item -Path "out\api" -ItemType Directory -Force | Out-Null }
            
            # Dosyaları kopyala
            if (Test-Path "indexer\data") {
                $files = Get-ChildItem "indexer\data\*.json" -ErrorAction SilentlyContinue
                foreach ($file in $files) {
                    Copy-Item $file.FullName "public\api\" -Force
                    Write-Log "Copied: $($file.Name) -> public/api/"
                }
            }
            
            if (Test-Path "public\api") {
                $files = Get-ChildItem "public\api\*.json" -ErrorAction SilentlyContinue
                foreach ($file in $files) {
                    Copy-Item $file.FullName "out\api\" -Force
                    Write-Log "Copied: $($file.Name) -> out/api/"
                }
            }
            
            Write-Log "API files updated successfully" "SUCCESS"
        } catch {
            Write-Log "API file update error: $($_.Exception.Message)" "WARN"
        }
        
        # 3. Stats Update
        Write-Log "Step 3/4 - Generating statistics..."
        try {
            $stats = @{
                totalPools = 7
                totalEvents = 2570
                lastUpdated = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
                buildNumber = (Get-Random -Maximum 9999)
                autoDeployMode = $true
                cycleCount = $script:cycleCount
                version = "2.0"
                deployMethod = "Terminal"
            }
            
            # Gerçek sayıları dosyalardan al
            if (Test-Path "public\api\pools.json") {
                try {
                    $poolsContent = Get-Content "public\api\pools.json" -Raw | ConvertFrom-Json
                    if ($poolsContent) {
                        $poolKeys = $poolsContent | Get-Member -MemberType NoteProperty | Measure-Object
                        $stats.totalPools = $poolKeys.Count
                        Write-Log "Real pools found: $($stats.totalPools)" "INFO"
                    }
                } catch {
                    Write-Log "Error reading pools.json: $($_.Exception.Message)" "WARN"
                }
            }
            
            if (Test-Path "public\api\staking.json") {
                try {
                    $stakingContent = Get-Content "public\api\staking.json" -Raw | ConvertFrom-Json
                    if ($stakingContent -is [array]) { 
                        $stats.totalEvents = $stakingContent.Count 
                        Write-Log "Real events found: $($stats.totalEvents)" "INFO"
                    } elseif ($stakingContent) {
                        $eventKeys = $stakingContent | Get-Member -MemberType NoteProperty | Measure-Object
                        $stats.totalEvents = $eventKeys.Count
                        Write-Log "Real events found (object): $($stats.totalEvents)" "INFO"
                    }
                } catch {
                    Write-Log "Error reading staking.json: $($_.Exception.Message)" "WARN"
                }
            }
            
            $statsJson = $stats | ConvertTo-Json -Compress
            $statsJson | Out-File -FilePath "public\api\stats.json" -Encoding UTF8 -Force
            $statsJson | Out-File -FilePath "out\api\stats.json" -Encoding UTF8 -Force
            
            Write-Log "Stats: $($stats.totalPools) pools, $($stats.totalEvents) events, build #$($stats.buildNumber)" "SUCCESS"
        } catch {
            Write-Log "Stats generation error: $($_.Exception.Message)" "WARN"
        }
        
        # 4. Netlify Deploy
        Write-Log "Step 4/4 - Deploying to Netlify..."
        try {
            $deployTime = Get-Date -Format 'HH:mm:ss'
            Write-Log "Executing: netlify deploy --prod --dir=out"
            
            $deployOutput = & netlify deploy --prod --dir=out --message="Terminal Auto-Deploy #$($script:cycleCount) - $deployTime" 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Log "NETLIFY DEPLOY SUCCESSFUL!" "SUCCESS"
                Write-Log "Site URL: https://orderstake.netlify.app" "SUCCESS"
            } else {
                Write-Log "Deploy failed (exit code: $LASTEXITCODE)" "ERROR"
                Write-Log "Output: $deployOutput" "ERROR"
            }
        } catch {
            Write-Log "Netlify deploy error: $($_.Exception.Message)" "ERROR"
        }
        
        # Deploy özeti
        $deployEnd = Get-Date
        $duration = ($deployEnd - $deployStart).TotalSeconds
        
        Write-Header "DEPLOY CYCLE #$($script:cycleCount) COMPLETED"
        Write-Log "Duration: $([math]::Round($duration, 2)) seconds" "SUCCESS"
        Write-Log "Next cycle in $Interval seconds" "INFO"
        
        return $true
        
    } catch {
        Write-Log "FATAL ERROR in deploy cycle: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Ana döngü fonksiyonu
function Start-AutoDeploy {
    $script:isRunning = $true
    $script:startTime = Get-Date
    
    Write-Log "AUTO DEPLOY STARTED!" "SUCCESS"
    Write-Log "Deploy interval: $Interval seconds" "INFO"
    Write-Log "Press Ctrl+C to stop gracefully" "WARN"
    Write-Host ""
    
    try {
        while ($script:isRunning) {
            # Deploy yap
            $success = Start-Deploy
            
            if (-not $script:isRunning) { break }
            
            # Geri sayım
            Write-Log "Waiting $Interval seconds for next cycle..." "INFO"
            for ($i = $Interval; $i -gt 0; $i--) {
                if (-not $script:isRunning) { break }
                
                Write-Progress -Activity "Next Deploy Countdown" -Status "$i seconds remaining" -PercentComplete ((($Interval - $i) / $Interval) * 100)
                Start-Sleep -Seconds 1
            }
            
            Write-Progress -Activity "Next Deploy Countdown" -Completed
        }
    } catch {
        Write-Log "Auto deploy interrupted: $($_.Exception.Message)" "WARN"
    } finally {
        Write-Log "AUTO DEPLOY STOPPED" "WARN"
        $totalTime = (Get-Date) - $script:startTime
        Write-Log "Total runtime: $([math]::Round($totalTime.TotalMinutes, 2)) minutes" "INFO"
        Write-Log "Total cycles completed: $($script:cycleCount)" "INFO"
    }
}

# Ctrl+C yakalama
$null = Register-EngineEvent PowerShell.Exiting -Action {
    $script:isRunning = $false
    Write-Host ""
    Write-ColorText "Gracefully stopping..." "Yellow"
}

# Komut satırı parametrelerine göre çalış
if ($Start) {
    Start-AutoDeploy
} elseif ($Stop) {
    $script:isRunning = $false
    Write-Log "Stop signal sent" "WARN"
} elseif ($Status) {
    Write-Log "Status check - Runtime: $((Get-Date) - $script:startTime)" "INFO"
    Write-Log "Cycles completed: $script:cycleCount" "INFO"
    Write-Log "Is running: $script:isRunning" "INFO"
} else {
    # Interaktif mod
    Write-Host ""
    Write-ColorText "Available commands:" "Yellow"
    Write-Host "  1. Start Auto Deploy (Every $Interval seconds)"
    Write-Host "  2. Manual Deploy (One time)"
    Write-Host "  3. Exit"
    Write-Host ""
    
    do {
        $choice = Read-Host "Select option (1-3)"
        
        switch ($choice) {
            "1" {
                Start-AutoDeploy
                break
            }
            "2" {
                Write-Host ""
                Start-Deploy -IsManual $true
                Write-Host ""
                Write-ColorText "Press Enter to continue..." "Yellow"
                Read-Host
            }
            "3" {
                Write-Log "Exiting..." "INFO"
                exit 0
            }
            default {
                Write-Log "Invalid option. Please select 1, 2, or 3." "WARN"
            }
        }
    } while ($choice -ne "3")
}