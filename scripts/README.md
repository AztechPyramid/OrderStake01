# OrderStake Manuel Indexer Sistemi

Bu sistem GitHub Actions yerine local olarak çalışan basit ve güvenilir bir indexer sistemidir.

## 🚀 Hızlı Başlangıç

### 1. Tek Seferlik Index
```bash
scripts\quick-index.bat
```
- Indexer'ı çalıştırır
- API dosyalarını günceller  
- Pool sayısını gösterir

### 2. Index + Build + Deploy
```bash
scripts\index-and-deploy.bat
```
- Indexer'ı çalıştırır
- Next.js build yapar
- API dosyalarını günceller
- Deploy için hazırlar

### 3. Sadece Deploy
```bash
scripts\deploy.bat
```
- Netlify'e manual deploy yapar
- İlk defa çalıştırıyorsanız `netlify login` gerekli

## ⚙️ Otomatik Index (Cron Job)

### Windows Task Scheduler ile 15 dakikada bir çalıştırma:

1. **Task Scheduler** açın
2. **Create Basic Task** seçin
3. **Name:** OrderStake Auto Index
4. **Trigger:** Daily
5. **Start:** 00:00:00
6. **Repeat task every:** 15 minutes
7. **For a duration of:** 1 day
8. **Action:** Start a program
9. **Program:** `D:\OrderStake01\scripts\auto-index.bat`
10. **Start in:** `D:\OrderStake01`

### Log kontrolü:
```
scripts\auto-index.log
```

## 📁 Dosya Yapısı

```
scripts/
├── quick-index.bat        # Hızlı indexing
├── index-and-deploy.bat   # Full pipeline
├── deploy.bat             # Sadece deploy
├── auto-index.bat         # Otomatik index (sessiz)
└── auto-index.log         # Otomatik index logları
```

## 🔧 API Endpoints

- **Pools:** `/api/pools.json`
- **Events:** `/api/staking.json`  
- **Stats:** `/api/stats.json`
- **Info:** `/api/index.json`

## 📊 Durum Kontrolü

### Local API:
```bash
curl http://localhost:3000/api/stats.json
```

### Live API:
```bash
curl https://orderstake.netlify.app/api/stats.json
```

## 🚨 Sorun Giderme

### Indexer Çalışmıyor:
```bash
cd indexer
node indexer.js --once
```

### Build Hatası:
```bash
npm run build
```

### Deploy Hatası:
```bash
netlify login
netlify link
scripts\deploy.bat
```

## ⚡ Avantajlar

- ✅ GitHub Actions limitlı yok
- ✅ Netlify webhook sorunları yok  
- ✅ Tam kontrol
- ✅ Hızlı debugging
- ✅ Local testing
- ✅ Manuel veya otomatik
- ✅ Log dosyaları

## 📈 Monitoring

Auto-index log dosyasını kontrol ederek sistem durumunu takip edebilirsiniz:

```bash
tail -f scripts\auto-index.log
```