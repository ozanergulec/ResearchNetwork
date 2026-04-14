# Research Network - Yapay Zekâ Destekli Akademik İşbirliği Platformu

**"Araştırmacılar, Akademisyenler ve Öğrenciler için Akıllı Eşleştirme, İçerik Analizi ve İletişim Ağı"**

Bu proje, **TÜBİTAK-2209-A** araştırma önerisine dayalı olarak geliştirilmiş tam kapsamlı bir uygulamadır. Amacı; akademik literatürdeki dağınıklığı gidermek, doğru araştırmacıları bir araya getirmek ve araştırmacıların makale okuma süreçlerini yapay zekâ ile hızlandırmaktır. Bir **akademik sosyal ağ** olarak da nitelendirilebilecek olan bu sistem, içinde yapay zekâ asistanı, gerçek zamanlı sohbet, eşleştirme algoritmaları ve detaylı profil yönetimleri barındırır.

---

## 🖥️ Arayüzler ve Sayfalar (Kullanıcı Deneyimi Yolculuğu)

Platformu kullanacak bir kişinin deneyimleyeceği arayüzler ve sahip oldukları işlevler şu şekildedir:

### 1. Kimlik Doğrulama ve Güvenlik Sayfaları
*   **Kayıt ve Giriş Arayüzü (`/login`, `/register`)**: Kullanıcıların platforma katıldığı ekran. Herkes kendi akademik unvanı ve e-posta adresiyle kayıt olur.
*   **E-Posta Doğrulama ve Şifre İşlemleri (`/verify-email`, `/forgot-password`)**: Kayıt sonrası otomatik bir OTP (Tek Kullanımlık Şifre) maili ile hesap onayı alınır. Tüm şifre sıfırlama işlemleri güvenli JWT token'lar aracılığıyla yürütülür.

### 2. Ana Akış: Home Page (`/home`)
*   **Sistemin Kalbi**: Kullanıcı platforma giriş yaptığında onu karşılayan ana panodur (Dashboard). Burada ağınızdaki son gelişmeler, popüler ve trend olan araştırma konuları, platformdaki genel istatistikler ve güncel akademik hareketlilik sunulur.

### 3. Kullanıcı Profili ve Portfolyo (`/profile` & `/profile/:userId`)
*   **Akademik CV**: Bir araştırmacının kendini tanıttığı, unvanından araştırma ilgilerine (tag/etiketler) kadar her şeyini girebildiği sayfadır.
*   **Yayın Geçmişi**: Kullanıcı, yazdığı veya katkı sunduğu akademik makale ve PDF'leri buraya yükler.
*   **Başkalarını İnceleme**: Profil sayfaları public'tir (açıktır). Bir başka kullanıcının sayfasına girerek onun ne tarz çalışmalar yaptığını inceleyebilir, onunla iletişime geçme kararı alabilirsiniz.

### 4. Gelişmiş Arama ve Keşif (`/search`)
*   Platformun en detaylı modüllerinden biridir. Yalnızca metin bazlı değil, aynı zamanda çok boyutlu veri filtreleme sunar:
*   Araştırmacı arama (isim, alan, kuruma göre).
*   Geniş literatür ve platformdaki yayınlar arasında arama. 

### 5. Akıllı Öneriler ve Eşleştirme (`/recommendations`)
*   **AI Matchmaking**: Sisteminizin "arka plandaki beyni" burada devreye girer. Sizin profilinize girdiğiniz etiketler ve yüklediğiniz kendi makaleleriniz, diğer kullanıcılarla matematiksel olarak (vektörel pürüzsüzlük algoritmalarıyla) kıyaslanır. Size *"Sizinle aynı alanda çalışan şu kişilere göz atın"* şeklinde **Araştırmacı Önerileri** sunar.
*   **Makale Önerileri**: Geçmiş ilgi alanlarınıza dayanarak sistem size okumanız gereken akademik yayınları listeler.

### 6. Sohbet, İletişim ve Mesajlaşma (`/messages`)
*   **Sohbet Ekranı (`/messages`)**: Bir WhatsApp arayüzü gibi tasarlanmıştır. Sol tarafta eşleştiğiniz ve arkadaş olduğunuz araştırmacılar listelenir, sağ tarafta sohbet ekranı bulunur. Yazışmalar **anında (real-time)** karşı tarafa iletilir.
*   **Floating Chat (**: Platformda herhangi bir sayfada (`/home`, `/search` vb.) gezinirken, sayfanın sağ alt köşesindeki widget üzerinden konuşmalarınıza ara vermeden devam edebilirsiniz.

### 7. Makale İnceleme Asistanı (Belge İçi RAG AI)
*   Sistemdeki bir makaleye/yanyına tıkladığınızda karşınıza makale okuma modal'ı ile birlikte bir **Yapay Zekâ Asistanı** butonu çıkar. 
*   **Belgeyle Konuşma**: Makalenin tamamı çok uzun olsa dahi, yapay zekâ bunu hızla okuyup anlar. Siz "Bu çalışmanın metodolojisi nedir?", "Kullanılan analiz yöntemini özetle" dediğinizde size doğrudan makalenin içerisinden alıntı yaparak Türkçe (veya Çok Dilde) net cevaplar sunar.

### 8. Akran Değerlendirmesi (`/peer-review`)
*   Yüklenen veya incelenen bazı yayınlar, diğer araştırmacıların değerli görüşlerine açılır. Sistemin geri bildirim, akademik eleştiri ve karşılıklı değerlendirme (Peer Review) kültürünü yaşattığı özel modüldür.

### 9. Akıllı Bildirimler (`/notifications`)
*   İlgi alanınızla tamamen kesişen yeni bir makale platformda yayınlandığında.
*   Biri size bir mesaj gönderdiğinde veya profilinizi etkileşime soktuğunda sistem otomatik ve anında pop-up / bildirim düşürür.

### 10. Sistem Ayarları (`/settings`)
*   Hesap bilgilerini güncelleme, gizlilik ayarlarını belirleme, bildirim tercihlerini açıp kapama ve **Çoklu Dil (Multi-Language)** desteğini yönetme bölümüdür.

---

## 🏗️ Projenin Mimari Yapısı (Yazılım Teknolojileri)

Daha sorunsuz, hızlı ve modern bir yapı sunabilmek için proje 3 ana bacağa ve modern bir veri tabanına ayrılmıştır:

1.  **Backend (.NET 8 - C# Web API)**
    *   Sistemin ana veri aktarım noktasıdır. **Clean Architecture** prensibiyle yazılmıştır (Domain, Application, Infrastructure, API).
    *   **SignalR** kurgusu ile gerçek zamanlı (canlı) mesajlaşma altyapısını sağlar.
2.  **Frontend (React & TypeScript - Vite)**
    *   Tüm sayfa yapıları, routing işlemleri (sayfa arası geçişler) ve komponentler React ile çok hızlı (Single Page Application - SPA) modunda çalışır. Gelişmiş State yönetimi barındırır.
3.  **AI Service (Python - FastAPI)**
    *   **RAG (Retrieval-Augmented Generation)** görevleri, vektörel parçalama ve indeksleme işlemleri için yaratılmış bağımsız mikro hizmettir. Arka planda Groq API desteği ile Llama modellerini, yerelde ise HuggingFace (MiniLM, valhalla vb.) açık kaynak AI modellerini çalıştırır.
4.  **Veritabanı (PostgreSQL & pgvector)**
    *   Normal kullanıcı profil datalarının ve mesajların yanında; makalelerin sayısal gösterimleri olan milyonlarca boyutlu "vektör embeddings" hesaplamalarını ışık hızında bulabilmek için `pgvector` eklentisi kullanılır.

---

## 🚀 Başlangıç ve Kurulum Rehberi

Projeyi kendi bilgisayarınızda çalıştırmanın iki yolu vardır. Çalışacak servislerin senkronize başlaması için **Docker kullanmak en garantili yoldur.**

### Seçenek 1: Docker İle Otomatik Kurulum (Tavsiye Edilen)
Bilgisayarınızda **Docker Desktop**'ın çalıştığından emin olun.

1. Projenin ana klasörüne `.env` isimli bir dosya oluşturup aşağıdaki yapılandırmaları kendinize göre ekleyin:
   ```env
   GROQ_API_KEY=sizin_groq_api_anahtariniz
   SMTP_USER=testmailadresiniz@gmail.com
   SMTP_PASS=gmailden_alinan_uygulama_sifresi
   ```
2. Terminali ana klasörde açın ve yapılandırmayı inşa edip başlatın:
   ```bash
   docker compose up --build
   ```
   *(Tüm süreç boyunca sistem veritabanını oluşturacak, tabloları yükleyecek, arka uç ve yapay zekâ servislerini ayağa kaldırıp birbirleriyle eşleyecektir.)*

### Seçenek 2: Manuel Geliştirici Kurulumu (Koda Müdahale Edecekler İçin)
Eğer sistemi ayağa kaldırıp kodları canlı değiştirecekseniz her servisi ayrı terminallerde ve sırayla açmalısınız. *Gereksinimler: .NET 8, Node 18, Python 3.11, Postgres(pg15+ ve pgvector)*

**1. Veritabanı ve C# Backend API'si:**
*(Önce `src/ResearchNetwork.API/appsettings.json` içindeki veritabanı ayarlarını kendi bilgisayarınıza göre düzeltin)*
```bash
cd src/ResearchNetwork.Infrastructure
dotnet ef database update --startup-project ../ResearchNetwork.API

cd ../ResearchNetwork.API
dotnet run
```

**2. React Frontend Arayüzü:**
```bash
cd frontend
npm install   # Araçları kurar
npm run dev   # Geliştirici sunucusunda React'i ateşler
```

**3. Python Yapay Zekâ Servisi (FastAPI):**
```bash
cd ai-service
pip install -r requirements.txt   
uvicorn main:app --reload --port 8000
```

---

## 🔗 Portlar ve Kullanıcı Erişim Uç Noktaları (Erişim Linkleri)

*   💻 **Platform (React UI)**: http://localhost:5173 - Kullanıcının sisteme gireceği arayüz.
*   ⚙️ **Ana Backend API (C# Swagger Docs)**: http://localhost:5000/swagger - Data ve Rest uç noktaları listesi.
*   🧠 **Yapay Zekâ Beyni (FastAPI Docs)**: http://localhost:8000/docs - AI servislerine (Makale özetleme, vektör çıkarma vb.) giden istek endpoint'leri.

---

## 👥 Proje Geliştirme Ekibi

*   **P. Geliştiricileri**: Ozan ERGÜLEÇ, Seher OĞUZ
*   **Akademik Danışman**: Dr. Öğr. Üyesi Murat AK
*   **Destekleyen Kurum**: TÜBİTAK (2209-A Üniversite Öğrencileri Araştırma Projeleri Desteği Programı)
