# Research Network - Academic Collaboration Platform

"Akademisyenler ve Öğrenciler için Yapay Zekâ Destekli Akademik Eşleştirme ve İşbirliği Platformu"

Bu proje, TÜBİTAK-2209 araştırma önerisine dayalı olarak geliştirilmiş bir **çalışan iskelet** (working skeleton) uygulamasıdır.

## 📋 Gereksinimler

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL 15+](https://www.postgresql.org/download/)
- [Python 3.11+](https://www.python.org/downloads/)

## 🏗️ Proje Yapısı

```
ResearchNetwork/
├── ResearchNetwork.sln          # Ana solution dosyası
├── src/
│   ├── ResearchNetwork.Domain/         # Entity'ler (User, Publication)
│   ├── ResearchNetwork.Application/    # DTO'lar ve Interfaces
│   ├── ResearchNetwork.Infrastructure/ # EF Core, Repositories
│   └── ResearchNetwork.API/            # Web API, Controllers
├── frontend/                    # React TypeScript (Vite)
│   └── src/
│       ├── pages/              # Login, Profile, Recommendations
│       └── services/           # API service (axios)
└── ai-service/                  # Python FastAPI
    └── main.py                 # AI matching endpoint
```

## 🚀 Kurulum ve Çalıştırma

### 1. PostgreSQL Veritabanı

PostgreSQL kurulu olmalı. Varsayılan bağlantı ayarları:
- Host: `localhost`
- Port: `5432`
- Database: `researchnetwork`
- Username: `postgres`
- Password: `postgres`

Farklı ayarlar için `src/ResearchNetwork.API/appsettings.json` dosyasını düzenleyin.

### 2. Backend (.NET)

```bash
# Proje dizinine git
cd ResearchNetwork

# EF Core tools yükle (ilk kez)
dotnet tool install --global dotnet-ef

# Migration oluştur
cd src/ResearchNetwork.Infrastructure
dotnet ef migrations add InitialCreate --startup-project ../ResearchNetwork.API

# Veritabanını güncelle
dotnet ef database update --startup-project ../ResearchNetwork.API

# API'yi çalıştır
cd ../ResearchNetwork.API
dotnet run
```

API Swagger UI: http://localhost:5000/swagger

### 3. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

### 4. AI Service (FastAPI)

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

AI Service: http://localhost:8000/docs

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/register` | Yeni kullanıcı kaydı |
| POST | `/api/auth/login` | Giriş ve JWT token |

### Users
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/users` | Tüm kullanıcılar |
| GET | `/api/users/{id}` | Kullanıcı detayı |
| PUT | `/api/users/{id}` | Profil güncelleme (Auth) |
| DELETE | `/api/users/{id}` | Kullanıcı silme (Auth) |

### Publications
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/publications` | Tüm yayınlar |
| POST | `/api/publications` | Yeni yayın ekle (Auth) |

### AI Service
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/health` | Sağlık kontrolü |
| GET | `/api/hello` | Test endpoint |
| POST | `/api/match` | Araştırmacı eşleştirme |

## 🔐 Kimlik Doğrulama

JWT token tabanlı authentication. Login sonrası dönen token'ı `Authorization: Bearer <token>` header'ı ile gönderin.

## ⚙️ Konfigürasyon

### appsettings.json
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=researchnetwork;Username=postgres;Password=postgres"
  },
  "Jwt": {
    "Key": "YourSuperSecretKey",
    "Issuer": "ResearchNetwork"
  }
}
```

## 📝 Notlar

- CORS ayarları React (localhost:5173) için yapılandırılmıştır
- AI Service basit tag-matching algoritması kullanır (gelecekte NLP entegrasyonu planlanmaktadır)
- Tüm migration'lar manuel çalıştırılmalıdır

## 👥 Proje Ekibi

- Ozan ERGÜLEÇ
- Seher OĞUZ
- Danışman: Asst.Prof.Dr. Murat AK

---

*Bu proje TÜBİTAK-2209-A Üniversite Öğrencileri Araştırma Projeleri Desteği Programı için hazırlanmıştır.*
