# 🔧 Supabase Ayarları ve Test Adımları

## ⚠️ ÖNEMLİ - ÖNCE BUNU YAPIN!

### 1. Email Confirmation'ı Kapatın

1. **Supabase Dashboard'a gidin:** https://supabase.com/dashboard
2. Projenizi seçin
3. **Authentication** → **Settings** (sol menüden)
4. **Email** sekmesine tıklayın
5. **"Enable email confirmations"** → **KAPATIN** (toggle'ı disable yapın)
6. **Save** butonuna tıklayın

> ⚠️ Bu adım yapılmazsa kullanıcılar email onayı bekleyecek ve giriş yapamayacak!

---

## 📋 2. SQL Migration'ı Yeniden Çalıştırın

### Neden Yeniden?
Yeni migration dosyası şunları içeriyor:
- ✅ `auth.users` tablosunda trigger (otomatik profile + subscription oluşturma)
- ✅ INSERT policy (kullanıcılar kendi profile'larını oluşturabilir)
- ✅ Geliştirilmiş hata kontrolü

### Adımlar:

1. **Supabase Dashboard** → **SQL Editor**
2. **New Query** tıklayın
3. `supabase/migrations/001_initial_schema.sql` dosyasını açın
4. **TÜM İÇERİĞİ** kopyalayın
5. SQL Editor'e yapıştırın
6. **Run** butonuna tıklayın

### Başarı Kontrolü:

Migration sonunda şu mesajları göreceksiniz:
```
✅ Migration completed successfully!
⚠️  IMPORTANT: Disable email confirmations in Supabase Dashboard!
```

---

## 🧪 3. Test Edin

### A. Yeni Kullanıcı Kaydı

1. **Tarayıcıda:** http://localhost:3000/
2. **F12** ile Developer Console'u açın (önemli!)
3. **"Sign Up"** butonuna tıklayın
4. Formu doldurun:
   - Ad Soyad: Test User
   - Email: **YENİ BİR EMAIL** (daha önce kullanmadığınız)
   - Şifre: test123
5. **"Kayıt Ol"** tıklayın

### B. Console'da Kontrol

Console'da şu mesajları görmeli siniz:
```
✅ User created: [USER_ID] [EMAIL]
✅ Session created, user logged in
```

Eğer şunu görürseniz:
```
⚠️ Email confirmation required
```
**→ Adım 1'e dönün, email confirmation'ı kapatmayı unuttunuz!**

### C. Dashboard Kontrolü

Başarılı kayıt sonrası:
- ✅ Otomatik dashboard'a yönlendirileceksiniz
- ✅ Sidebar'da **2,500 kredi** göreceksiniz
- ✅ Plan: **Starter**
- ✅ **KENDİ** hesabınız, demo değil!

---

## 🔍 4. Supabase'de Doğrulama

### Table Editor'de Kontrol:

1. **Supabase Dashboard** → **Table Editor**

2. **profiles** tablosu:
   - Yeni kullanıcınızı görmelisiniz
   - Email doğru mu?

3. **subscriptions** tablosu:
   - user_id yeni kullanıcınızın ID'si olmalı
   - plan_type: STARTER
   - credits: 2500
   - status: ACTIVE

4. **credit_transactions** tablosu:
   - Henüz boş olmalı (ilk işlem yapılmadı)

---

## 🎬 5. Kredi Sistemini Test Edin

### Shorts Oluştur:

1. **Shorts Oluştur** sayfasına gidin
2. Konu: "Yapay Zeka"
3. **"Senaryo Oluştur"** → 6 sahne
4. **"Sahneleri İşle"**

### Beklenen Sonuç:

- ✅ Notification: "Tahmini maliyet: 600 kredi"
- ✅ Sahneler oluşturulacak
- ✅ Sidebar: 2500 → **1900 kredi**
- ✅ Gerçek zamanlı güncelleme

### Supabase'de Kontrol:

**credit_transactions** tablosunda yeni kayıt:
```
amount: -600
type: USAGE
description: "Shorts creation: 6 scenes"
balance_after: 1900
```

---

## ✅ Başarı Kriterleri

- [ ] Email confirmation kapatıldı
- [ ] SQL migration başarıyla çalıştı
- [ ] Yeni kullanıcı kaydı yapıldı
- [ ] Console'da "Session created" mesajı görüldü
- [ ] Dashboard'da 2,500 kredi görünüyor
- [ ] Supabase'de profile + subscription oluştu
- [ ] Kredi düşüşü çalışıyor
- [ ] Transaction log'da kayıt var

**Hepsi ✓ ise: Sistem tamamen çalışıyor!** 🎉

---

## 🐛 Sorun Giderme

### "Email confirmation required" hatası

**Çözüm:** 
- Supabase → Authentication → Settings → Email
- "Enable email confirmations" → **KAPALI** olmalı
- Save ve sayfayı yenileyin

### "User already registered" hatası

**Çözüm:** 
- Farklı bir email kullanın
- VEYA Supabase → Authentication → Users → Kullanıcıyı silin

### Trigger çalışmıyor

**Kontrol:**
```sql
-- SQL Editor'de çalıştırın:
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

Sonuç boşsa → Migration'ı tekrar çalıştırın

### Profile oluşmuyor

**Kontrol:**
```sql
-- RLS policy kontrolü:
SELECT policyname FROM pg_policies 
WHERE tablename = 'profiles';
```

"Users can insert own profile" olmalı

---

## 📞 Hala Sorun Varsa

1. Browser console'u temizleyin (Clear console)
2. Sayfayı yenileyin (Ctrl+F5)
3. Yeni bir incognito/private window açın
4. Tekrar deneyin
5. Console'daki HATA mesajlarını kontrol edin
