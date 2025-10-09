Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Geçerli dizini al
strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
strPSScript = strScriptPath & "\OrderStake-AutoDeploy.ps1"

' PowerShell komutunu oluştur
strCommand = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Normal -File """ & strPSScript & """"

' Komutu çalıştır
objShell.Run strCommand, 1, False

' Mesaj göster
MsgBox "🚀 OrderStake Auto Deploy uygulaması başlatıldı!" & vbCrLf & vbCrLf & "Grafik arayüz açılacak, START butonuna basın!", vbInformation, "OrderStake"