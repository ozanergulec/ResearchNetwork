# 🎓 Research Network

## Akademisyenler ve Araştırmacılar için Yapay Zekâ Destekli Akademik Eşleştirme ve İşbirliği Platformu

Bu proje, TÜBİTAK-2209-A Üniversite Öğrencileri Araştırma Projeleri kapsamında geliştirilmektedir. Platform, akademisyenlerin ve öğrencilerin ortak araştırma alanlarına göre eşleştirilmesini ve işbirliği yapmasını sağlayan web tabanlı bir uygulamadır.

---

## 📑 İçindekiler

1. [Proje Hakkında](#-proje-hakkında)
2. [Mimari Yapı](#-mimari-yapı)
3. [Teknoloji Stack](#-teknoloji-stack)
4. [Proje Yapısı](#-proje-yapısı)
5. [Kurulum](#-kurulum)
6. [API Dokümantasyonu](#-api-dokümantasyonu)
7. [Veritabanı Şeması](#-veritabanı-şeması)
8. [Ekran Görüntüleri](#-ekran-görüntüleri)
9. [Proje Ekibi](#-proje-ekibi)

---

## 📖 Proje Hakkında

### Problem
Akademik dünyada araştırmacılar, kendi ilgi alanlarına uygun işbirliği fırsatları bulmakta zorlanmaktadır. Mevcut platformlar ya çok genel kalmakta ya da akademik ihtiyaçlara özgü özellikler sunmamaktadır.

### Çözüm
Research Network, yapay zeka destekli eşleştirme algoritmaları kullanarak:
- Araştırmacıların profillerini ve ilgi alanlarını analiz eder
- Benzer araştırma alanlarına sahip akademisyenleri önerir
- İşbirliği fırsatlarını kolaylaştırır

### Temel Özellikler
- ✅ Kullanıcı kaydı ve JWT tabanlı kimlik doğrulama
- ✅ Akademik profil yönetimi
- ✅ Yayın ekleme ve listeleme
- ✅ Yapay zeka destekli araştırmacı önerileri
- 🔄 Mesajlaşma sistemi (planlanan)
- 🔄 Proje işbirliği araçları (planlanan)

---

## 🏛 Mimari Yapı

### Clean Architecture (Temiz Mimari)

Proje, **Clean Architecture** prensiplerine uygun olarak 4 katmanlı bir yapıda tasarlanmıştır:

```
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                             │
│                 (ResearchNetwork.API)                        │
│         Controllers, Middleware, Configuration               │
├─────────────────────────────────────────────────────────────┤
│                   Application Layer                          │
│              (ResearchNetwork.Application)                   │
│           DTOs, Interfaces, Business Logic                   │
├─────────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                        │
│             (ResearchNetwork.Infrastructure)                 │
│      EF Core, Repositories, External Services                │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                            │
│                (ResearchNetwork.Domain)                      │
│               Entities, Value Objects                        │
└─────────────────────────────────────────────────────────────┘
```

### Neden Clean Architecture?

| Avantaj | Açıklama |
|---------|----------|
| **Bağımsızlık** | Her katman kendi sorumluluğuna sahip, birbirinden bağımsız |
| **Test Edilebilirlik** | Business logic UI ve veritabanından ayrı, kolay test edilebilir |
| **Esneklik** | Veritabanı veya UI değişikliği diğer katmanları etkilemez |
| **Bakım Kolaylığı** | Kod organizasyonu net, yeni geliştiriciler kolay adapte olur |

### Katman Açıklamaları

#### 1. Domain Layer (`ResearchNetwork.Domain`)
En iç katman, hiçbir dış bağımlılığı yoktur.
- **Entities**: `User`, `Publication`
- İş kuralları ve domain logic burada tanımlanır

#### 2. Application Layer (`ResearchNetwork.Application`)
Domain katmanına bağımlı, iş süreçlerini yönetir.
- **DTOs**: `UserDto`, `LoginDto`, `RegisterDto`, `PublicationDto`
- **Interfaces**: `IUserRepository`, `IPublicationRepository`
- Validation, mapping ve iş akışları

#### 3. Infrastructure Layer (`ResearchNetwork.Infrastructure`)
Dış sistemlerle iletişim sağlar.
- **DbContext**: Entity Framework Core ile PostgreSQL bağlantısı
- **Repositories**: `UserRepository`, `PublicationRepository`
- **Migrations**: Veritabanı şema değişiklikleri

#### 4. API Layer (`ResearchNetwork.API`)
Kullanıcı arayüzü ile iletişim noktası.
- **Controllers**: `AuthController`, `UsersController`, `PublicationsController`
- **Middleware**: JWT Authentication, CORS
- Swagger dokümantasyonu

---

## 🔧 Teknoloji Stack

### Backend
| Teknoloji | Versiyon | Kullanım Amacı |
|-----------|----------|----------------|
| .NET | 8.0 | Ana framework |
| ASP.NET Core | 8.0 | Web API |
| Entity Framework Core | 8.0 | ORM (Object-Relational Mapping) |
| PostgreSQL | 15+ | İlişkisel veritabanı |
| JWT | - | Token tabanlı kimlik doğrulama |
| Swagger | - | API dokümantasyonu |

### Frontend
| Teknoloji | Versiyon | Kullanım Amacı |
|-----------|----------|----------------|
| React | 18 | UI framework |
| TypeScript | 5.x | Tip güvenli JavaScript |
| Vite | 5.x | Build tool ve dev server |
| Axios | - | HTTP istemcisi |
| React Router | 6 | Sayfa yönlendirme |

### AI Service
| Teknoloji | Versiyon | Kullanım Amacı |
|-----------|----------|----------------|
| Python | 3.11+ | Ana dil |
| FastAPI | - | REST API framework |
| Uvicorn | - | ASGI server |

---

## 📁 Proje Yapısı

```
ResearchNetwork/
│
├── 📄 ResearchNetwork.sln              # Visual Studio Solution dosyası
├── 📄 README.md                        # Proje dokümantasyonu
│
├── 📂 src/                             # Backend kaynak kodları
│   │
│   ├── 📂 ResearchNetwork.Domain/      # 🔵 Domain Katmanı
│   │   └── Entities/
│   │       ├── User.cs                 # Kullanıcı entity
│   │       └── Publication.cs          # Yayın entity
│   │
│   ├── 📂 ResearchNetwork.Application/ # 🟢 Application Katmanı
│   │   ├── DTOs/
│   │   │   ├── UserDto.cs              # Kullanıcı veri transfer objesi
│   │   │   ├── AuthDtos.cs             # Login/Register DTO'ları
│   │   │   └── PublicationDtos.cs      # Yayın DTO'ları
│   │   └── Interfaces/
│   │       ├── IUserRepository.cs      # Kullanıcı repository arayüzü
│   │       └── IPublicationRepository.cs
│   │
│   ├── 📂 ResearchNetwork.Infrastructure/  # 🟠 Infrastructure Katmanı
│   │   ├── Data/
│   │   │   └── AppDbContext.cs         # EF Core DbContext
│   │   ├── Repositories/
│   │   │   ├── UserRepository.cs       # Kullanıcı repository
│   │   │   └── PublicationRepository.cs
│   │   └── Migrations/                 # Veritabanı migration'ları
│   │
│   └── 📂 ResearchNetwork.API/         # 🔴 API Katmanı
│       ├── Controllers/
│       │   ├── AuthController.cs       # Giriş/Kayıt işlemleri
│       │   ├── UsersController.cs      # Kullanıcı CRUD
│       │   └── PublicationsController.cs
│       ├── Program.cs                  # Uygulama giriş noktası
│       └── appsettings.json            # Konfigürasyon
│
├── 📂 frontend/                        # React TypeScript uygulaması
│   ├── 📄 package.json
│   ├── 📄 vite.config.ts
│   └── 📂 src/
│       ├── 📂 components/              # Yeniden kullanılabilir bileşenler
│       │   ├── 📂 ui/                  # Temel UI bileşenleri
│       │   │   ├── Button.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Card.tsx
│       │   │   └── LoadingSpinner.tsx
│       │   ├── 📂 layout/              # Sayfa düzeni bileşenleri
│       │   │   └── Navbar.tsx
│       │   └── 📂 features/            # Özellik bazlı bileşenler
│       │       ├── auth/               # Kimlik doğrulama
│       │       ├── profile/            # Profil yönetimi
│       │       └── recommendations/    # Öneriler
│       ├── 📂 pages/                   # Sayfa bileşenleri
│       │   ├── LoginPage.tsx
│       │   ├── RegisterPage.tsx
│       │   ├── ProfilePage.tsx
│       │   └── RecommendationsPage.tsx
│       ├── 📂 services/                # API servisleri
│       │   └── api.ts                  # Axios yapılandırması
│       ├── 📂 styles/                  # CSS dosyaları
│       │   ├── index.css               # Global stiller
│       │   ├── LoginPage.css
│       │   └── ProfilePage.css
│       ├── App.tsx                     # Ana uygulama bileşeni
│       └── main.tsx                    # Uygulama giriş noktası
│
└── 📂 ai-service/                      # Python AI servisi
    ├── main.py                         # FastAPI uygulaması
    └── requirements.txt                # Python bağımlılıkları
```

---

## 🚀 Kurulum

### Gereksinimler

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL 15+](https://www.postgresql.org/download/)
- [Python 3.11+](https://www.python.org/downloads/) (AI servisi için)

### 1. Veritabanı Kurulumu

```bash
# PostgreSQL'de veritabanı oluştur
psql -U postgres -c "CREATE DATABASE researchnetwork;"
```

### 2. Backend Kurulumu

```bash
# Proje dizinine git
cd ResearchNetwork

# Migration uygula
dotnet ef database update \
  --project src/ResearchNetwork.Infrastructure/ResearchNetwork.Infrastructure.csproj \
  --startup-project src/ResearchNetwork.API/ResearchNetwork.API.csproj

# API'yi çalıştır
dotnet run --project src/ResearchNetwork.API/ResearchNetwork.API.csproj
```

**API Adresi:** http://localhost:5230  
**Swagger UI:** http://localhost:5230/swagger

### 3. Frontend Kurulumu

```bash
cd frontend
npm install
npm run dev
```

**Frontend Adresi:** http://localhost:5173

### 4. AI Service Kurulumu (Opsiyonel)

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**AI Service Adresi:** http://localhost:8000/docs

---

## 📚 API Dokümantasyonu

### Kimlik Doğrulama (Auth)

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| POST | `/api/auth/register` | Yeni kullanıcı kaydı | ❌ |
| POST | `/api/auth/login` | Giriş yap, JWT token al | ❌ |

### Kullanıcılar (Users)

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | `/api/users` | Tüm kullanıcıları listele | ❌ |
| GET | `/api/users/{id}` | Kullanıcı detayı | ❌ |
| PUT | `/api/users/{id}` | Profil güncelle | ✅ |
| DELETE | `/api/users/{id}` | Kullanıcı sil | ✅ |

### Yayınlar (Publications)

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | `/api/publications` | Tüm yayınları listele | ❌ |
| POST | `/api/publications` | Yeni yayın ekle | ✅ |

### JWT Kullanımı

Login sonrası dönen token'ı her istekte header'a ekleyin:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 🗄 Veritabanı Şeması

### Entity-Relationship Diagram

```
┌─────────────────────────┐       ┌─────────────────────────┐
│         USERS           │       │      PUBLICATIONS       │
├─────────────────────────┤       ├─────────────────────────┤
│ Id (PK, UUID)           │       │ Id (PK, UUID)           │
│ Email (unique)          │◄──────│ AuthorId (FK)           │
│ PasswordHash            │       │ Title                   │
│ FullName                │       │ Abstract                │
│ Title                   │       │ DOI                     │
│ Institution             │       │ PublishedDate           │
│ Department              │       │ Keywords[]              │
│ Bio                     │       │ CreatedAt               │
│ InterestTags[]          │       └─────────────────────────┘
│ CreatedAt               │
│ UpdatedAt               │
└─────────────────────────┘
```

### Tablolar

#### Users
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| Id | UUID | Primary Key |
| Email | VARCHAR(256) | Unique, zorunlu |
| PasswordHash | TEXT | BCrypt ile hashlenmiş şifre |
| FullName | VARCHAR(200) | Zorunlu |
| Title | VARCHAR(100) | Opsiyonel (Prof., Dr., vb.) |
| Institution | VARCHAR(200) | Opsiyonel |
| Department | VARCHAR(200) | Opsiyonel |
| Bio | VARCHAR(2000) | Opsiyonel |
| InterestTags | TEXT[] | Araştırma alanları |
| CreatedAt | TIMESTAMP | Kayıt tarihi |
| UpdatedAt | TIMESTAMP | Güncelleme tarihi |

#### Publications
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| Id | UUID | Primary Key |
| AuthorId | UUID | Foreign Key → Users |
| Title | VARCHAR(500) | Zorunlu |
| Abstract | VARCHAR(5000) | Opsiyonel |
| DOI | VARCHAR(100) | Opsiyonel |
| PublishedDate | TIMESTAMP | Opsiyonel |
| Keywords | TEXT[] | Anahtar kelimeler |
| CreatedAt | TIMESTAMP | Kayıt tarihi |

---

## 🎨 Renk Paleti

Uygulama yeşil tonlarında bir renk paletine sahiptir:

| Renk | Hex | Kullanım |
|------|-----|----------|
| Primary Darkest | `#1a3a25` | Arka plan gradientleri |
| Primary Dark | `#325330` | Buton gradientleri |
| Primary | `#557845` | Ana tema rengi |
| Primary Light | `#86a863` | Hover efektleri |
| Primary Lightest | `#cce986` | Açık arka planlar |

---

## 👥 Proje Ekibi

| İsim | Rol |
|------|-----|
| **Ozan ERGÜLEÇ** | Geliştirici |
| **Seher OĞUZ** | Geliştirici |
| **Asst.Prof.Dr. Murat AK** | Danışman |

---

## 📜 Lisans

Bu proje TÜBİTAK-2209-A Üniversite Öğrencileri Araştırma Projeleri Desteği Programı kapsamında geliştirilmektedir.

---

## 📞 İletişim

Sorularınız için: [proje e-posta adresi]

---

*Son güncelleme: Aralık 2025*
