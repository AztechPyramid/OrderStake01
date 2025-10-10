# OrderStake Netlify Serverless Indexer

## 🚀 Ne Değişti?

Artık OrderStake indexer sisteminiz **Netlify Serverless Functions** ile çalışıyor! Bu demek oluyor ki:

- ✅ **24/7 Otomatik Çalışma** - İnternet kesilse bile çalışmaya devam eder
- ✅ **Sıfır Maliyet** - GitHub Actions'tan çok daha ucuz
- ✅ **Kolay Yönetim** - Web paneli ile kontrol
- ✅ **Güvenilir** - Netlify'nin stabil altyapısı
- ✅ **Hızlı** - Serverless fonksiyonlar ile instant başlatma

## 🛠️ Kurulum

### 1. İlk Kurulum
```powershell
.\scripts\OrderStake-Netlify.ps1 -Setup
```

### 2. Environment Variables (Netlify Dashboard'da)
```bash
RPC_URL=https://api.avax.network/ext/bc/C/rpc
ECOSYSTEM_STAKING_FACTORY_ADDRESS=0xYourFactoryAddress
ORDER_NFT_LAUNCH_ADDRESS=0xYourNFTLaunchAddress
START_BLOCK=40000000
```

### 3. Deploy
```powershell
.\scripts\OrderStake-Netlify.ps1 -Deploy
```

## 🎮 Kullanım

### Development Mode
```powershell
.\scripts\OrderStake-Netlify.ps1 -Dev
```

### Production Deploy (Fast Mode - No Build)
```powershell
.\scripts\OrderStake-Netlify.ps1 -Deploy
# VEYA
npm run netlify:fast-deploy
```

**💡 Artık build yapmıyor! Çok daha hızlı ve build minutes tasarrufu.**

### Status Check
```powershell
.\scripts\OrderStake-Netlify.ps1 -Status
```

## 🔧 Fonksiyonlar

### 1. Indexer Cron (`/.netlify/functions/indexer-cron`)
- **Otomatik Çalışma**: Her 1 dakikada ⚡
- **Görev**: Blockchain'i index et, API dosyalarını güncelle  
- **Timeout**: 10 dakika (Netlify maksimum)
- **Build**: Hayır (sadece function execution) 💰

### 2. Admin Panel (`/.netlify/functions/indexer-admin`)
- **Manuel Çalıştırma**: `?action=run`
- **Status Kontrol**: `?action=status`
- **Konfigürasyon**: `?action=config`
- **Loglar**: `?action=logs`

## 📊 Admin Panel Kullanımı

### Status Kontrol
```bash
GET https://orderstake.netlify.app/.netlify/functions/indexer-admin?action=status
```

### Manuel Çalıştırma
```bash
GET https://orderstake.netlify.app/.netlify/functions/indexer-admin?action=run
```

### Konfigürasyon Görüntüleme
```bash
GET https://orderstake.netlify.app/.netlify/functions/indexer-admin?action=config
```

## ⏰ Otomatik Çalışma

Sistem şu şekilde çalışır:

1. **Her 1 dakikada** Netlify otomatik olarak `indexer-cron` fonksiyonunu çalıştırır ⚡
2. **Blockchain'i index eder** (son bloktan devam eder)
3. **API dosyalarını günceller** (`public/api/` ve `out/api/`)
4. **Stats oluşturur** (pool sayısı, event sayısı vs.)
5. **Build yapmaz** - sadece function execution (build minutes tasarrufu!) 💰

## 💰 Maliyet Optimizasyonu

| Özellik | Eski Sistem | Yeni Sistem |
|---------|-------------|-------------|
| İnterval | 15 dakika | **1 dakika** ⚡ |
| Build yapılır mı? | ✅ Evet (pahalı) | ❌ Hayır (tasarruf) |
| Build Minutes | ~20/ay | **0/ay** 💰 |
| Function Calls | 2,880/ay | **43,200/ay** |
| Netlify Limit | 300 build min | 1M function calls |
| Maliyet | Pahalı | **Ücretsiz** ✅ |

**Result: 15x daha aktif, sıfır build minute kullanımı!**

## 🔄 Eski Sistemden Farklar

| Özellik | Eski (.bat) | Yeni (Netlify) |
|---------|-------------|----------------|
| Çalışma | Bilgisayarınız açık | 24/7 Cloud |
| Maliyet | Elektrik + İnternet | Ücretsiz |
| Güvenilirlik | İnternet kesintisi = stop | Her zaman çalışır |
| Kontrol | Local terminal | Web admin panel |
| Monitoring | Manuel | Otomatik + loglar |

## 🚨 Sorun Giderme

### Environment Variables Eksik
```bash
# Netlify dashboard'da bu değişkenleri set edin:
RPC_URL
ECOSYSTEM_STAKING_FACTORY_ADDRESS  
ORDER_NFT_LAUNCH_ADDRESS
```

### Fonksiyon Çalışmıyor
```bash
# Admin panel ile kontrol edin:
https://orderstake.netlify.app/.netlify/functions/indexer-admin?action=status
```

### Manuel Test
```bash
# Development mode'da test:
netlify dev
# Sonra: http://localhost:8888/.netlify/functions/indexer-cron
```

## 📈 Monitoring

### Netlify Dashboard
- Function logs
- Build logs
- Deployment history
- Performance metrics

### Admin Panel
- Real-time status
- Last run timestamp
- Error tracking
- File sizes

## 🔒 Güvenlik

- Environment variables Netlify'de şifrelenmiş
- Functions sadece HTTPS
- CORS properly configured
- No sensitive data in code

## 🎯 Avantajlar

1. **Maliyetsiz**: GitHub Actions limitlerini aşmaz
2. **Güvenilir**: Netlify'nin CDN ve altyapısı
3. **Hızlı**: Serverless instant start
4. **Kolay**: Web-based admin panel
5. **Şeffaf**: Detaylı logging ve monitoring

---

**🎉 Artık sisteminiz bulutta çalışıyor! İnternet kesilse, bilgisayar kapansa bile indexer çalışmaya devam edecek.**