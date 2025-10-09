# Masaüstüne kısayol oluşturucu
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ScriptPath = Join-Path $PSScriptRoot "🚀 OrderStake App.bat"
$ShortcutPath = Join-Path $DesktopPath "🚀 OrderStake Auto Deploy.lnk"

$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $ScriptPath
$Shortcut.WorkingDirectory = Split-Path $ScriptPath
$Shortcut.Description = "OrderStake Auto Deploy - Her 1 dakikada otomatik deploy"
$Shortcut.Save()

Write-Host "✅ Masaüstüne kısayol oluşturuldu!" -ForegroundColor Green
Write-Host "📂 Konum: $ShortcutPath" -ForegroundColor Cyan
Write-Host "🚀 Artık masaüstündeki ikona çift tıklayarak başlatabilirsiniz!" -ForegroundColor Yellow