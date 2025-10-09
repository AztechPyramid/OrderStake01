# 🔐 GitHub Actions Secrets Kurulum Rehberi

## GitHub Repository Secrets Ayarları

GitHub Actions'ın çalışması için aşağıdaki secrets'ları repository'ye eklemeniz gerekiyor:

### 1️⃣ GitHub Web Arayüzüne Git
1. https://github.com/AztechPyramid/OrderStake01 adresine git
2. **Settings** sekmesine tıkla
3. Sol menüden **Secrets and variables** → **Actions** seçin

### 2️⃣ Gerekli Secrets'ları Ekle

#### 🌐 NETLIFY_SITE_ID
```
3fe355c2-a641-4856-95ec-31f13198c3d3
```

#### 🔑 NETLIFY_AUTH_TOKEN
Bu token'ı almak için terminal'de:
```bash
# Terminal'den çalıştır:
netlify auth:list
# veya
netlify status
```

Eğer token görünmüyorsa, yeni token oluşturmak için:
1. https://app.netlify.com/user/applications#personal-access-tokens adresine git
2. **New access token** butonuna tıkla
3. Token adı: `OrderStake-GitHub-Actions`
4. Oluşturulan token'ı kopyala

### 3️⃣ Secrets Ekleme Adımları

Her secret için:
1. **New repository secret** butonuna tıkla
2. **Name** alanına secret adını yaz (örn: `NETLIFY_SITE_ID`)
3. **Secret** alanına değeri yapıştır
4. **Add secret** butonuna tıkla

### 4️⃣ Gerekli Secrets Listesi

| Secret Name | Değer | Açıklama |
|-------------|--------|----------|
| `NETLIFY_SITE_ID` | `3fe355c2-a641-4856-95ec-31f13198c3d3` | OrderStake Netlify site ID'si |
| `NETLIFY_AUTH_TOKEN` | `YOUR_TOKEN_HERE` | Netlify authentication token |

### 5️⃣ Token Alma Komutları

Eğer Netlify token'ı bulamıyorsanız:

```bash
# Netlify giriş durumunu kontrol et
netlify status

# Eğer giriş yapmamışsanız
netlify login

# Token bilgilerini al
netlify env:list
```

### 6️⃣ Doğrulama

Secrets'lar eklendikten sonra:
1. GitHub Actions sekmesine git
2. Workflow'u manuel olarak çalıştır:
   - **Actions** → **OrderStake Auto Deploy (Hourly)**
   - **Run workflow** butonuna tıkla

### 🚀 Otomatik Çalışma

Secrets'lar eklendikten sonra:
- ✅ GitHub Actions her saat başında otomatik çalışacak
- ✅ Indexer son bloktan devam edecek
- ✅ API dosyaları güncellenecek
- ✅ Netlify'e otomatik deploy olacak

### 🛠️ Manuel Test

Terminal'den test etmek için:
```bash
# Local terminal test
cd scripts
powershell -ExecutionPolicy Bypass -File "OrderStake-Terminal.ps1"
```

---

## 📋 Kontrol Listesi

- [ ] GitHub repository'ye dosyalar push edildi
- [ ] NETLIFY_SITE_ID secret'ı eklendi
- [ ] NETLIFY_AUTH_TOKEN secret'ı eklendi
- [ ] GitHub Actions ilk kez manuel olarak test edildi
- [ ] Workflow'un başarılı çalıştığı doğrulandı

## 🎯 Sonuç

Bu ayarlar tamamlandıktan sonra OrderStake projesi:
- 🕐 **Her saat başında otomatik index + deploy**
- 📊 **Son bloktan devam eden indexer**
- 🚀 **Otomatik Netlify deployment**
- 📈 **GitHub Actions ile sürekli güncelleme**

**OrderStake artık tamamen otomatik çalışacak!** 🎉