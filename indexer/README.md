# OrderStake Event Indexer

Avalanche C-Chain üzerindeki OrderStake ecosystem contract'larını izleyen ve event'leri indeksleyen sistem.

## 🏗️ Özellikler

- **EcosystemStakingFactory** event'lerini izleme (PoolCreated, WhitelistUpdated, BurnAmountUpdated)
- **EcosystemStaking** pool event'lerini izleme (Staked, Unstaked, RewardClaimed, EmergencyWithdraw, PoolUpdated)
- **Incremental indexing** - Her çalıştırmada kaldığı yerden devam eder
- **GitHub Actions** entegrasyonu - 15 dakikada bir otomatik çalışır
- **RESTful API** - İndekslenen verilere erişim
- **Pool discovery** - Factory'den otomatik pool keşfi
- **Robust error handling** - Ağ hatalarına karşı dayanıklı

## 📋 Contract Adresleri

- **Factory**: `0x3E3d8a430fF70E89C035301943375377CC7343A7`
- **ORDER Token**: `0x1BEd077195307229FcCBC719C5f2ce6416A58180`

## 🚀 Kurulum

### Yerel Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Çevre değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle

# İndexer'ı başlat
npm start

# Sadece indexleme (API olmadan)
node indexer.js --once
```

### Çevre Değişkenleri

```env
# Avalanche C-Chain RPC Configuration  
RPC_URL=https://api.avax.network/ext/bc/C/rpc

# Contract Addresses
ECOSYSTEM_STAKING_FACTORY_ADDRESS=0x3E3d8a430fF70E89C035301943375377CC7343A7
ORDER_TOKEN_ADDRESS=0x1BEd077195307229FcCBC719C5f2ce6416A58180

# Indexing Configuration
START_BLOCK=69858946
POLLING_INTERVAL=15000
MAX_BLOCK_RANGE=2000

# API Server
API_PORT=3001
API_ENABLED=true
```

## 🤖 GitHub Actions

İndexer her 15 dakikada bir otomatik olarak çalışır:

- 📅 **Zamanlama**: `*/15 * * * *` (15 dakikada bir)
- 🔄 **Manuel tetikleme**: Workflow_dispatch ile
- 💾 **State persistence**: GitHub Actions cache ile
- 📊 **Artifact upload**: İndekslenen data 30 gün saklanır

### Manuel Çalıştırma

GitHub repository'de **Actions** sekmesinden:
1. "OrderStake Event Indexer" workflow'unu seç
2. "Run workflow" butonuna tıkla
3. İsteğe bağlı: "Force complete reindexing" seçeneğini işaretle

## 📡 API Endpoints

Indexer çalışırken REST API mevcut:

```bash
# Sistem durumu
GET /health

# Tüm pool'ları getir
GET /api/pools

# Belirli pool'u getir
GET /api/pools/{address}

# Event'leri getir
GET /api/events/staking?limit=100&offset=0

# İstatistikler
GET /api/stats
```

## 📊 İndekslenen Veriler

### Pool Events
- **PoolCreated**: Yeni pool oluşturulması
- **Staked**: Token stake edilmesi
- **Unstaked**: Token unstake edilmesi  
- **RewardClaimed**: Ödül talep edilmesi
- **EmergencyWithdraw**: Acil durum çekmesi
- **PoolUpdated**: Pool durumu güncellemesi

### Factory Events  
- **WhitelistUpdated**: Whitelist değişiklikleri
- **BurnAmountUpdated**: Burn miktarı değişiklikleri

## 🗂️ Dosya Yapısı

```
indexer/
├── indexer.js          # Ana indexer dosyası
├── api-server.js       # REST API server
├── config.json         # Konfigürasyon
├── package.json        # Dependencies
├── .env                # Çevre değişkenleri
├── abi/                # Contract ABI'ları
│   ├── EcosystemStaking.json
│   └── EcosystemStakingFactory.json
├── data/               # İndekslenen veriler
│   ├── staking.json    # Event verileri
│   └── pools.json      # Pool verileri
├── listeners/          # Event listener'ları
│   ├── staking.js      # Staking events
│   └── nft.js          # NFT events (gelecek)
└── utils/              # Yardımcı modüller
    ├── blockchain.js   # Blockchain bağlantı
    ├── logger.js       # Logging sistemi
    └── storage.js      # Veri depolama
```

## 🔍 İzleme ve Debugging

### Loglar
```bash
# Canlı log takibi
tail -f data/indexer.log

# Son 100 satır
tail -100 data/indexer.log
```

### Data Kontrol
```bash
# Event sayısını kontrol et
wc -l data/staking.json

# Son event'leri gör
tail -5 data/staking.json | jq .

# Pool sayısını kontrol et
jq '. | length' data/pools.json
```

## 🛠️ Geliştirme

### Test Çalıştırma
```bash
# Development mode (nodemon ile)
npm run dev

# Sadece indexleme testi
node indexer.js --once

# Belirli block range'i test et
START_BLOCK=69900000 node indexer.js --once
```

### Yeni Contract Ekleme
1. `abi/` klasörüne ABI dosyası ekle
2. `config.json`'da contract'ı tanımla
3. `listeners/` klasöründe listener oluştur
4. `indexer.js`'de listener'ı kaydet

## 📈 Performans

- **Block range**: 2000 block'luk gruplar halinde işler
- **Rate limiting**: RPC çağrıları arasında gecikme
- **Memory usage**: ~100MB tipik kullanım
- **Processing speed**: ~500 block/dakika

## 🔐 Güvenlik

- RPC endpoint'leri rate limit'e tabidir
- Private key gerektirmez (sadece okuma)
- Tüm veriler public blockchain'den gelir
- CORS koruması API'de aktif

## 📞 Destek

Sorularınız için:
- 🐛 **Bug reports**: GitHub Issues
- 💬 **Discussions**: GitHub Discussions
- 📧 **Email**: OrderStake team

---

**OrderStake** - Elite Gladiator Staking on Avalanche 🏛️