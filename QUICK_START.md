# ⚡ Hızlı Başlangıç - Supabase Sign Up Testi

## 🎯 Adım 1: Supabase Email Confirmation Ayarı

Sign up'ın çalışması için Supabase'de email confirmation'ı kapatmanız gerekiyor.

### Supabase Dashboard'da:

1. **Authentication → Settings** sayfasına gidin
2. **Email Auth** bölümünü bulun
3. **"Enable email confirmations"** ayarını **KAPATIN** (disable)
4. **Save** butonuna tıklayın

> ⚠️ **Önemli:** Bu ayar kapalı olmazsa, kullanıcılar kayıt olduktan sonra email onayı bekleyecek ve giriş yapamayacaklar.

---

## 🎯 Adım 2: SQL Migration'ı Çalıştırın

1. **Supabase Dashboard** → **SQL Editor**
2. **New Query** tıklayın
3. `supabase/migrations/001_initial_schema.sql` dosyasının içeriğini kopyalayın
4. SQL Editor'e yapıştırın
5. **Run** butonuna tıklayın

Başarılı olursa: "Success. No rows returned" mesajı göreceksiniz.

---

## 🎯 Adım 3: Uygulamayı Test Edin

### 3.1 Localhost'u Açın

Tarayıcınızda: **http://localhost:3000/**

### 3.2 Sign Up (Kayıt Ol)

1. **"Sign Up"** veya **"Şimdi Abone Ol"** butonuna tıklayın
2. Formu doldurun:
   - **Ad Soyad:** İstediğiniz isim
   - **Email:** Gerçek bir email adresi
   - **Şifre:** En az 6 karakter

3. **"Kayıt Ol"** butonuna tıklayın

### 3.3 Otomatik Giriş

Kayıt başarılı olursa:
- ✅ Otomatik olarak dashboard'a yönlendirileceksiniz
- ✅ Sidebar'da **2,500 kredi** göreceksiniz
- ✅ Plan: **Starter**

---

## 🎯 Adım 4: Kredi Sistemini Test Edin

### 4.1 Shorts Oluştur

1. Sol menüden **"Shorts Oluştur"** tıklayın
2. Konu girin: "Yapay Zeka"
3. **"Senaryo Oluştur"** tıklayın
4. Sahne sayısı: **6**
5. **"Sahneleri İşle"** tıklayın

### 4.2 Kredi Kontrolü

- ✅ Notification: "Tahmini maliyet: 600 kredi"
- ✅ Sahneler oluşturulacak
- ✅ Sidebar: 2500 → **1900 kredi**
- ✅ Gerçek zamanlı güncelleme

### 4.3 Veritabanı Kontrolü

Supabase Dashboard → **Table Editor** → **credit_transactions**

Göreceğiniz kayıt:
```
amount: -600
type: USAGE
description: "Shorts creation: 6 scenes"
balance_after: 1900
```

---

## 🎯 Adım 5: Logout/Login Testi

### 5.1 Çıkış Yap

Settings → **Logout**

### 5.2 Tekrar Giriş Yap

1. **"Sign In"** butonuna tıklayın
2. Email ve şifrenizi girin
3. **"Giriş Yap"**

### 5.3 Veri Kalıcılığı Kontrolü

- ✅ Krediler hala **1900**
- ✅ Plan hala **Starter**
- ✅ Önceki video işlemleri kayıtlı

---

## 🎯 Bonus: Manuel Kullanıcı Oluşturma

Eğer Sign Up çalışmazsa, manuel olarak kullanıcı oluşturabilirsiniz:

### Supabase Dashboard:

1. **Authentication** → **Users**
2. **Add User** → **Create new user**
3. Bilgileri girin:
   - Email: test@example.com
   - Password: test123
   - **Auto Confirm User:** ✓ (İŞARETLEYİN!)
4. **Create User**

Trigger otomatik çalışacak ve:
- ✅ Profile oluşturulacak
- ✅ Subscription oluşturulacak (Starter, 2500 kredi)

---

## ✅ Başarı Kontrol Listesi

- [ ] Email confirmation kapatıldı
- [ ] SQL migration çalıştırıldı
- [ ] Sign Up formu çalışıyor
- [ ] Kayıt sonrası otomatik giriş yapılıyor
- [ ] 2500 kredi görünüyor
- [ ] Shorts oluşturma kredi düşüyor
- [ ] Logout/Login sonrası veriler kalıcı
- [ ] Transaction log'da kayıtlar var

**Hepsi ✓ ise: Supabase entegrasyonu başarılı!** 🎉

---

## 🐛 Sorun Giderme

### "Email not confirmed" hatası

**Çözüm:** Supabase → Authentication → Settings → Email confirmations **KAPALI** olmalı

### "User already registered" hatası

**Çözüm:** Farklı bir email adresi kullanın veya Supabase'den eski kullanıcıyı silin

### Krediler güncellenmiyor

**Çözüm:** 
1. Browser console'u açın (F12)
2. Hata mesajlarını kontrol edin
3. Supabase connection'ı kontrol edin

### "Failed to create profile" hatası

**Çözüm:** SQL migration'ın doğru çalıştığından emin olun:
```sql
SELECT * FROM profiles;
SELECT * FROM subscriptions;
```

---

## 📞 Yardım

Sorun yaşarsanız:
1. Browser console'daki hataları kontrol edin
2. Supabase Dashboard → Logs → Auth Logs
3. Network tab'de API isteklerini inceleyin
