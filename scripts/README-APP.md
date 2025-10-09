# 🚀 OrderStake Auto Deploy Uygulaması

## 📱 Özellikler
- ✅ **ASLA KAPANMAZ** - Grafik arayüzlü Windows uygulaması
- 🔄 **Otomatik Deploy** - Her 1 dakikada bir Netlify'e deploy
- 📊 **Son Bloktan Devam** - Indexer kaldığı yerden devam eder
- 🛡️ **Hata Toleransı** - Herhangi bir hata olsa bile çalışmaya devam eder
- ⚡ **Manuel Deploy** - İstediğiniz zaman manuel deploy yapabilirsiniz
- 📝 **Canlı Log** - Tüm işlemleri canlı olarak görürsünüz

## 🎯 Kullanım Seçenekleri

### 1️⃣ Kolay Yol (Önerilen)
1. `START-ORDERSTAKE-APP.bat` dosyasını **çift tıklayın**
2. Grafik arayüz açılacak
3. **"🚀 START DEPLOY"** butonuna basın
4. Otomatik olarak çalışmaya başlar

### 2️⃣ EXE Dosyası (En Stabil)
1. `Build-EXE.ps1` dosyasını çalıştırın (EXE oluşturmak için)
2. Oluşan `OrderStake-AutoDeploy.exe` dosyasını çift tıklayın
3. **"🚀 START DEPLOY"** butonuna basın

### 3️⃣ PowerShell Script
1. PowerShell'i yönetici olarak açın
2. `Set-ExecutionPolicy Bypass -Force` komutu çalıştırın
3. `.\OrderStake-AutoDeploy.ps1` komutu çalıştırın

## 🖼️ Arayüz Butonları

| Buton | Açıklama |
|-------|----------|
| 🚀 START DEPLOY | Otomatik deploy'u başlatır (Her 1 dakika) |
| ⏸️ STOP | Otomatik deploy'u durdurur |
| ⚡ MANUAL DEPLOY | Hemen bir deploy yapar |
| ❌ EXIT | Uygulamadan çıkar (onay ister) |

## 📊 Ekran Bilgileri

- **Durum**: Çalışıyor/Durdu
- **Cycle**: Kaç deploy yapıldığı
- **Sonraki deploy**: Geri sayım
- **Log**: Tüm işlemlerin detayı

## 🛡️ Güvenlik Özellikleri

- ✅ Pencere kapatma koruması (onay ister)
- ✅ Hata durumunda devam etme
- ✅ Son blok bilgisini koruma
- ✅ Network hatalarında yeniden deneme

## 🔧 Teknik Detaylar

### İşlem Sırası (Her Cycle):
1. **📊 Indexing** - Son bloktan devam eder
2. **📄 API Update** - JSON dosyalarını kopyalar
3. **📊 Stats Update** - İstatistikleri günceller
4. **🚀 Netlify Deploy** - Production'a deploy eder

### Dosya Konumları:
- Script: `scripts/OrderStake-AutoDeploy.ps1`
- Launcher: `scripts/START-ORDERSTAKE-APP.bat`
- EXE Builder: `scripts/Build-EXE.ps1`

## ❓ Sorun Giderme

### Uygulama açılmıyor?
- PowerShell execution policy'yi kontrol edin: `Get-ExecutionPolicy`
- Yönetici olarak çalıştırın: `Set-ExecutionPolicy Bypass -Force`

### Deploy başarısız?
- Netlify CLI kurulu mu? `netlify --version`
- Internet bağlantısı var mı?
- `indexer/indexer.js` dosyası mevcut mu?

### EXE oluşturulamıyor?
- ps2exe modülünü yükleyin: `Install-Module -Name ps2exe -Force`
- PowerShell 5.1 veya üzerini kullanın

## 🎉 Avantajlar

| BAT Dosyası | Bu Uygulama |
|-------------|-------------|
| ❌ Kapanıyor | ✅ ASLA kapanmaz |
| ❌ Hata log'u yok | ✅ Canlı log |
| ❌ Manuel kontrol yok | ✅ START/STOP butonları |
| ❌ Geri sayım yok | ✅ Countdown timer |
| ❌ Siyah ekran | ✅ Renkli grafik arayüz |

## 🚀 Hemen Başla!

```bash
# Basit kullanım
START-ORDERSTAKE-APP.bat

# Veya EXE olarak
.\Build-EXE.ps1
.\OrderStake-AutoDeploy.exe
```

**🎯 Bu uygulama KESINLIKLE kapanmaz ve sürekli çalışır!** 🛡️