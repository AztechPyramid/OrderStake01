#!/usr/bin/env powershell

# OrderStake Netlify Deployment Script
param(
    [switch]$Deploy,
    [switch]$Dev,
    [switch]$Status,
    [switch]$Setup
)

function Write-ColorText {
    param([string]$Text, [string]$Color = "White")
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

# Ana dizine geç
$rootPath = "D:\OrderStake02"
if (Test-Path $rootPath) {
    Set-Location $rootPath
} else {
    Write-ColorText "Root directory not found: $rootPath" "Red"
    exit 1
}

Clear-Host
Write-Header "ORDERSTAKE NETLIFY MANAGER v3.0"
Write-ColorText "Serverless Blockchain Indexer" "Yellow"
Write-Host ""

if ($Setup) {
    Write-Header "Netlify Setup"
    
    Write-ColorText "Installing dependencies..." "Cyan"
    try {
        npm install
        Write-ColorText "Dependencies installed" "Green"
    } catch {
        Write-ColorText "Failed to install dependencies" "Red"
        exit 1
    }
    
    Write-ColorText "Setting up Netlify CLI..." "Cyan"
    Write-ColorText "Netlify login..." "Cyan"
    netlify login
    
    Write-ColorText "Initializing Netlify site..." "Cyan"
    netlify init
    
    Write-ColorText "Environment variables setup..." "Yellow"
    Write-Host "Please set these environment variables in Netlify dashboard:"
    Write-ColorText "  RPC_URL=https://api.avax.network/ext/bc/C/rpc" "White"
    Write-ColorText "  ECOSYSTEM_STAKING_FACTORY_ADDRESS=your_factory_address" "White"
    Write-ColorText "  ORDER_NFT_LAUNCH_ADDRESS=your_nft_launch_address" "White"
    Write-ColorText "  START_BLOCK=40000000" "White"
    
    Write-Host ""
    Write-ColorText "Setup completed!" "Green"
    
    exit 0
}

if ($Dev) {
    Write-Header "Development Mode"
    
    Write-ColorText "Starting Netlify dev server..." "Cyan"
    Write-ColorText "   - Site: http://localhost:8888" "White"
    Write-ColorText "   - Functions: http://localhost:8888/.netlify/functions/" "White"
    Write-ColorText "   - Admin: http://localhost:8888/.netlify/functions/indexer-admin" "White"
    Write-Host ""
    
    try {
        netlify dev
    } catch {
        Write-ColorText "Failed to start dev server" "Red"
        exit 1
    }
    
    exit 0
}

if ($Deploy) {
    Write-Header "Production Deployment"
    
    Write-ColorText "Fast Deploy Mode - No Build Required!" "Yellow"
    Write-ColorText "Functions will auto-update API files every minute" "Cyan"
    
    Write-ColorText "Running initial indexing..." "Cyan"
    try {
        npm run indexer:once
        Write-ColorText "Initial indexing completed" "Green"
    } catch {
        Write-ColorText "Initial indexing had issues, continuing..." "Yellow"
    }
    
    Write-ColorText "Fast deploying to Netlify (no build)..." "Cyan"
    try {
        netlify deploy --prod --dir=out --message="OrderStake Fast Deploy v3.0 - 1min interval"
        Write-ColorText "Fast deployment successful!" "Green"
        
        Write-Host ""
        Write-ColorText "OrderStake is now running on Netlify!" "Green"
        Write-ColorText "Functions available:" "Cyan"
        Write-ColorText "   - Indexer Cron: /.netlify/functions/indexer-cron" "White"
        Write-ColorText "   - Admin Panel: /.netlify/functions/indexer-admin" "White"
        Write-Host ""
        Write-ColorText "Cron job will run EVERY MINUTE automatically" "Green"
        Write-ColorText "Build minutes saved! Only function execution used" "Green"
        
    } catch {
        Write-ColorText "Deployment failed" "Red"
        exit 1
    }
    
    exit 0
}

if ($Status) {
    Write-Header "System Status"
    
    Write-ColorText "Checking Netlify status..." "Cyan"
    try {
        netlify status
        Write-ColorText "Netlify status retrieved" "Green"
    } catch {
        Write-ColorText "Failed to get Netlify status" "Red"
    }
    
    Write-ColorText "Checking functions..." "Cyan"
    try {
        netlify functions:list
        Write-ColorText "Functions listed" "Green"
    } catch {
        Write-ColorText "Failed to list functions" "Red"
    }
    
    exit 0
}

# Interaktif mod
Write-Host ""
Write-ColorText "Available commands:" "Yellow"
Write-Host "  1. Setup Netlify (First time)"
Write-Host "  2. Development Mode"
Write-Host "  3. Deploy to Production"
Write-Host "  4. Check Status"
Write-Host "  5. Exit"
Write-Host ""

do {
    $choice = Read-Host "Select option (1-5)"
    
    switch ($choice) {
        "1" {
            & $MyInvocation.MyCommand.Path -Setup
            break
        }
        "2" {
            & $MyInvocation.MyCommand.Path -Dev
            break
        }
        "3" {
            & $MyInvocation.MyCommand.Path -Deploy
            break
        }
        "4" {
            & $MyInvocation.MyCommand.Path -Status
            break
        }
        "5" {
            Write-ColorText "Goodbye!" "Green"
            exit 0
        }
        default {
            Write-ColorText "Invalid option. Please select 1-5." "Red"
        }
    }
} while ($choice -ne "5")