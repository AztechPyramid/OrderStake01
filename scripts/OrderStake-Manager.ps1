Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

# XAML for the GUI
$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="OrderStake Indexer Manager" Height="700" Width="900"
        Background="#1e1e1e" Foreground="White"
        ResizeMode="CanResize" WindowStartupLocation="CenterScreen">
    <Grid Margin="20">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>
        
        <!-- Header -->
        <StackPanel Grid.Row="0" Orientation="Horizontal" Margin="0,0,0,20">
            <TextBlock Text="🚀 OrderStake Indexer Manager" FontSize="24" FontWeight="Bold" Foreground="#00d4aa"/>
            <TextBlock Text="v1.0" FontSize="14" Margin="10,5,0,0" Foreground="#888"/>
        </StackPanel>
        
        <!-- Control Buttons -->
        <Grid Grid.Row="1" Margin="0,0,0,20">
            <Grid.RowDefinitions>
                <RowDefinition Height="*"/>
                <RowDefinition Height="*"/>
            </Grid.RowDefinitions>
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="*"/>
            </Grid.ColumnDefinitions>
            
            <!-- First Row -->
            <Button Name="QuickIndexBtn" Grid.Row="0" Grid.Column="0" Content="⚡ Quick Index" 
                    Background="#0078d4" Foreground="White" Height="45" Margin="5"
                    FontSize="12" FontWeight="Bold"/>
            
            <Button Name="FullPipelineBtn" Grid.Row="0" Grid.Column="1" Content="🔄 Index + Build" 
                    Background="#107c10" Foreground="White" Height="45" Margin="5"
                    FontSize="12" FontWeight="Bold"/>
            
            <Button Name="DeployBtn" Grid.Row="0" Grid.Column="2" Content="🚀 Deploy to Netlify" 
                    Background="#ff4b1f" Foreground="White" Height="45" Margin="5"
                    FontSize="12" FontWeight="Bold"/>
            
            <Button Name="AutoSetupBtn" Grid.Row="0" Grid.Column="3" Content="⏰ Auto Setup" 
                    Background="#5a5a5a" Foreground="White" Height="45" Margin="5"
                    FontSize="12" FontWeight="Bold"/>
            
            <!-- Second Row -->
            <Button Name="AutoDeployBtn" Grid.Row="1" Grid.ColumnSpan="2" Content="🎯 AUTO DEPLOY - TEK TIK!" 
                    Background="#8A2BE2" Foreground="White" Height="45" Margin="5"
                    FontSize="14" FontWeight="Bold"/>
            
            <Button Name="OneClickBtn" Grid.Row="1" Grid.ColumnSpan="2" Content="🚀 ONE-CLICK START" 
                    Background="#FF6B35" Foreground="White" Height="45" Margin="5"
                    FontSize="14" FontWeight="Bold"/>
        </Grid>
        
        <!-- Status and Logs -->
        <Grid Grid.Row="2">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="1*"/>
                <ColumnDefinition Width="1*"/>
            </Grid.ColumnDefinitions>
            
            <!-- Status Panel -->
            <GroupBox Grid.Column="0" Header="📊 Status" Foreground="White" Margin="0,0,10,0">
                <StackPanel>
                    <TextBlock Name="StatusText" Text="Ready to start..." Margin="10"/>
                    
                    <Separator Background="#444" Margin="5"/>
                    
                    <StackPanel Orientation="Horizontal" Margin="10,5">
                        <TextBlock Text="Total Pools: " Width="100"/>
                        <TextBlock Name="PoolCountText" Text="Loading..." Foreground="#00d4aa"/>
                    </StackPanel>
                    
                    <StackPanel Orientation="Horizontal" Margin="10,5">
                        <TextBlock Text="Total Events: " Width="100"/>
                        <TextBlock Name="EventCountText" Text="Loading..." Foreground="#00d4aa"/>
                    </StackPanel>
                    
                    <StackPanel Orientation="Horizontal" Margin="10,5">
                        <TextBlock Text="Last Updated: " Width="100"/>
                        <TextBlock Name="LastUpdatedText" Text="Loading..." Foreground="#888"/>
                    </StackPanel>
                    
                    <StackPanel Orientation="Horizontal" Margin="10,5">
                        <TextBlock Text="Live API: " Width="100"/>
                        <TextBlock Name="LiveApiText" Text="Checking..." Foreground="#888"/>
                    </StackPanel>
                    
                    <Separator Background="#444" Margin="5"/>
                    
                    <Button Name="RefreshStatusBtn" Content="🔄 Refresh Status" 
                            Background="#333" Foreground="White" Height="30" Margin="10"/>
                    
                    <Button Name="OpenLiveApiBtn" Content="🌐 Open Live API" 
                            Background="#333" Foreground="White" Height="30" Margin="10"/>
                </StackPanel>
            </GroupBox>
            
            <!-- Logs Panel -->
            <GroupBox Grid.Column="1" Header="📝 Logs" Foreground="White" Margin="10,0,0,0">
                <Grid>
                    <Grid.RowDefinitions>
                        <RowDefinition Height="*"/>
                        <RowDefinition Height="Auto"/>
                    </Grid.RowDefinitions>
                    
                    <ScrollViewer Grid.Row="0" VerticalScrollBarVisibility="Auto">
                        <TextBlock Name="LogsText" Text="Logs will appear here..." 
                                   Background="#2d2d2d" Padding="10" FontFamily="Consolas" FontSize="12"/>
                    </ScrollViewer>
                    
                    <Button Name="ClearLogsBtn" Grid.Row="1" Content="🗑️ Clear Logs" 
                            Background="#333" Foreground="White" Height="30" Margin="0,10,0,0"/>
                </Grid>
            </GroupBox>
        </Grid>
        
        <!-- Progress Bar -->
        <Grid Grid.Row="3" Margin="0,20,0,0">
            <Grid.RowDefinitions>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="Auto"/>
            </Grid.RowDefinitions>
            
            <TextBlock Name="ProgressText" Grid.Row="0" Text="Ready" HorizontalAlignment="Center" Margin="0,0,0,5"/>
            <ProgressBar Name="ProgressBar" Grid.Row="1" Height="20" Background="#333" Foreground="#00d4aa"/>
        </Grid>
    </Grid>
</Window>
"@

# Load XAML
$reader = [System.Xml.XmlReader]::Create([System.IO.StringReader]$xaml)
$window = [Windows.Markup.XamlReader]::Load($reader)

# Get controls
$QuickIndexBtn = $window.FindName("QuickIndexBtn")
$FullPipelineBtn = $window.FindName("FullPipelineBtn")
$DeployBtn = $window.FindName("DeployBtn")
$AutoSetupBtn = $window.FindName("AutoSetupBtn")
$AutoDeployBtn = $window.FindName("AutoDeployBtn")
$OneClickBtn = $window.FindName("OneClickBtn")
$RefreshStatusBtn = $window.FindName("RefreshStatusBtn")
$OpenLiveApiBtn = $window.FindName("OpenLiveApiBtn")
$ClearLogsBtn = $window.FindName("ClearLogsBtn")

$StatusText = $window.FindName("StatusText")
$PoolCountText = $window.FindName("PoolCountText")
$EventCountText = $window.FindName("EventCountText")
$LastUpdatedText = $window.FindName("LastUpdatedText")
$LiveApiText = $window.FindName("LiveApiText")
$LogsText = $window.FindName("LogsText")
$ProgressText = $window.FindName("ProgressText")
$ProgressBar = $window.FindName("ProgressBar")

# Set working directory
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkingDir = Split-Path -Parent $ScriptPath
Set-Location $WorkingDir

# Log function
function Add-Log {
    param($Message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    $LogsText.Text += "[$timestamp] $Message`n"
    $LogsText.Dispatcher.Invoke([Action]{}, "Render")
    
    # Auto-scroll to bottom
    $scrollViewer = $LogsText.Parent
    if ($scrollViewer -is [System.Windows.Controls.ScrollViewer]) {
        $scrollViewer.ScrollToEnd()
    }
}

# Update progress
function Update-Progress {
    param($Text, $Percent = 0)
    $ProgressText.Text = $Text
    $ProgressBar.Value = $Percent
}

# Refresh status function
function Refresh-Status {
    try {
        Add-Log "Refreshing status..."
        
        # Check local API files
        if (Test-Path "out\api\stats.json") {
            $localStats = Get-Content "out\api\stats.json" | ConvertFrom-Json
            $PoolCountText.Text = $localStats.totalPools
            $EventCountText.Text = $localStats.totalEvents
            $LastUpdatedText.Text = $localStats.lastUpdated
        } else {
            $PoolCountText.Text = "No data"
            $EventCountText.Text = "No data"
            $LastUpdatedText.Text = "No data"
        }
        
        # Check live API
        try {
            $response = Invoke-WebRequest -Uri "https://orderstake.netlify.app/api/stats.json" -UseBasicParsing -TimeoutSec 10
            $liveStats = $response.Content | ConvertFrom-Json
            $LiveApiText.Text = "✅ Online ($($liveStats.totalPools) pools)"
            $LiveApiText.Foreground = "#00d4aa"
        } catch {
            $LiveApiText.Text = "❌ Offline"
            $LiveApiText.Foreground = "#ff4b1f"
        }
        
        Add-Log "Status refreshed successfully"
    } catch {
        Add-Log "Error refreshing status: $($_.Exception.Message)"
    }
}

# Run script function
function Run-Script {
    param($ScriptName, $Description)
    
    try {
        Add-Log "Starting: $Description"
        Update-Progress "Running $Description..." 25
        
        $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "scripts\$ScriptName" -Wait -PassThru -NoNewWindow
        
        if ($process.ExitCode -eq 0) {
            Add-Log "✅ Completed: $Description"
            Update-Progress "✅ $Description completed" 100
            Start-Sleep 1
            Update-Progress "Ready" 0
            Refresh-Status
        } else {
            Add-Log "❌ Failed: $Description (Exit code: $($process.ExitCode))"
            Update-Progress "❌ $Description failed" 0
        }
    } catch {
        Add-Log "❌ Error running $Description`: $($_.Exception.Message)"
        Update-Progress "❌ Error occurred" 0
    }
}

# Button events
$QuickIndexBtn.Add_Click({
    $StatusText.Text = "Running quick index..."
    Run-Script "quick-index.bat" "Quick Index"
    $StatusText.Text = "Quick index completed"
})

$FullPipelineBtn.Add_Click({
    $StatusText.Text = "Running full pipeline..."
    Run-Script "index-and-deploy.bat" "Index + Build Pipeline"
    $StatusText.Text = "Full pipeline completed"
})

$DeployBtn.Add_Click({
    $StatusText.Text = "Deploying to Netlify..."
    
    $result = [System.Windows.MessageBox]::Show(
        "This will deploy to Netlify. Make sure you're logged in to Netlify CLI.`n`nContinue?",
        "Confirm Deploy", 
        [System.Windows.MessageBoxButton]::YesNo,
        [System.Windows.MessageBoxImage]::Question
    )
    
    if ($result -eq [System.Windows.MessageBoxResult]::Yes) {
        Run-Script "deploy.bat" "Netlify Deploy"
        $StatusText.Text = "Deploy completed"
    } else {
        $StatusText.Text = "Deploy cancelled"
    }
})

$AutoSetupBtn.Add_Click({
    $message = @"
Auto Setup will create a Windows Task Scheduler job to run indexing every 15 minutes.

The task will:
• Run 'auto-index.bat' every 15 minutes
• Log to 'scripts\auto-index.log'
• Start immediately and continue 24/7

Do you want to proceed?
"@
    
    $result = [System.Windows.MessageBox]::Show($message, "Auto Setup", [System.Windows.MessageBoxButton]::YesNo, [System.Windows.MessageBoxImage]::Information)
    
    if ($result -eq [System.Windows.MessageBoxResult]::Yes) {
        try {
            Add-Log "Setting up auto indexing task..."
            
            # Create Task Scheduler task
            $taskName = "OrderStake-AutoIndex"
            $scriptPath = Join-Path $WorkingDir "scripts\auto-index.bat"
            
            # Remove existing task if it exists
            schtasks /delete /tn $taskName /f 2>$null
            
            # Create new task
            $result = schtasks /create /tn $taskName /tr $scriptPath /sc minute /mo 15 /st 00:00 /sd 01/01/2024 /ed 12/31/2030 /ru "SYSTEM"
            
            if ($LASTEXITCODE -eq 0) {
                Add-Log "✅ Auto indexing task created successfully"
                [System.Windows.MessageBox]::Show("Auto indexing is now set up!`n`nTask Name: $taskName`nInterval: Every 15 minutes`nLog File: scripts\auto-index.log", "Success", [System.Windows.MessageBoxButton]::OK, [System.Windows.MessageBoxImage]::Information)
            } else {
                Add-Log "❌ Failed to create task"
            }
        } catch {
            Add-Log "❌ Error setting up auto task: $($_.Exception.Message)"
        }
    }
})

$AutoDeployBtn.Add_Click({
    $StatusText.Text = "Starting Auto Deploy system..."
    
    $result = [System.Windows.MessageBox]::Show(
        "🎯 AUTO DEPLOY SYSTEM`n`nThis will start continuous auto deployment:`n• Index every 15 minutes`n• Auto build & deploy to Netlify`n• Find new pools automatically`n• Run in background`n`nThis will open a separate window. Continue?",
        "Auto Deploy System", 
        [System.Windows.MessageBoxButton]::YesNo,
        [System.Windows.MessageBoxImage]::Information
    )
    
    if ($result -eq [System.Windows.MessageBoxResult]::Yes) {
        Add-Log "🎯 Starting Auto Deploy system..."
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "scripts\auto-deployer.bat" -WorkingDirectory $WorkingDir
        $StatusText.Text = "Auto Deploy system started in separate window"
        Add-Log "✅ Auto Deploy system launched"
    } else {
        $StatusText.Text = "Auto Deploy cancelled"
    }
})

$OneClickBtn.Add_Click({
    $StatusText.Text = "Starting One-Click system..."
    
    $result = [System.Windows.MessageBox]::Show(
        "🚀 ONE-CLICK START SYSTEM`n`nThis will start the ultimate auto system:`n• Continuous monitoring`n• Auto index & deploy`n• New pool detection`n• 15-minute cycles`n• User-friendly interface`n`nThis will open the One-Click interface. Continue?",
        "One-Click Start", 
        [System.Windows.MessageBoxButton]::YesNo,
        [System.Windows.MessageBoxImage]::Information
    )
    
    if ($result -eq [System.Windows.MessageBoxResult]::Yes) {
        Add-Log "🚀 Starting One-Click system..."
        Start-Process -FilePath "scripts\ONE-CLICK-START.bat" -WorkingDirectory $WorkingDir
        $StatusText.Text = "One-Click system started"
        Add-Log "✅ One-Click system launched"
    } else {
        $StatusText.Text = "One-Click cancelled"
    }
})

$RefreshStatusBtn.Add_Click({ Refresh-Status })

$OpenLiveApiBtn.Add_Click({
    Start-Process "https://orderstake.netlify.app/api/stats.json"
})

$ClearLogsBtn.Add_Click({
    $LogsText.Text = ""
    Add-Log "Logs cleared"
})

# Initialize
Add-Log "OrderStake Indexer Manager started"
Add-Log "Working directory: $WorkingDir"
Refresh-Status

# Show window
$window.ShowDialog() | Out-Null