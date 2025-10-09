# OrderStake Index Manager PowerShell Helper
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("quick", "full", "deploy", "status")]
    [string]$Action
)

$BasePath = Split-Path -Parent $PSScriptRoot
Set-Location $BasePath

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor Cyan
}

function Get-ApiStats {
    try {
        if (Test-Path "out/api/stats.json") {
            $stats = Get-Content "out/api/stats.json" | ConvertFrom-Json
            return @{
                pools = $stats.totalPools
                events = $stats.totalEvents
                lastUpdated = $stats.lastUpdated
                buildNumber = $stats.buildNumber
            }
        }
    } catch {
        return @{pools=0; events=0; lastUpdated="Never"; buildNumber=0}
    }
    return @{pools=0; events=0; lastUpdated="Never"; buildNumber=0}
}

switch ($Action) {
    "quick" {
        Write-Log "🚀 Starting Quick Index..."
        & "scripts\quick-index.bat"
        Write-Log "✅ Quick Index completed"
    }
    
    "full" {
        Write-Log "🚀 Starting Full Pipeline..."
        & "scripts\index-and-deploy.bat"
        Write-Log "✅ Full Pipeline completed"
    }
    
    "deploy" {
        Write-Log "☁️ Starting Netlify Deploy..."
        & "scripts\deploy.bat"
        Write-Log "✅ Deploy completed"
    }
    
    "status" {
        Write-Log "📊 Getting system status..."
        $stats = Get-ApiStats
        Write-Host "Pools: $($stats.pools)" -ForegroundColor Green
        Write-Host "Events: $($stats.events)" -ForegroundColor Green
        Write-Host "Last Updated: $($stats.lastUpdated)" -ForegroundColor Green
        Write-Host "Build: $($stats.buildNumber)" -ForegroundColor Green
    }
}