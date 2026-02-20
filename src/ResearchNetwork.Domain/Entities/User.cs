using ResearchNetwork.Domain.Enums;

namespace ResearchNetwork.Domain.Entities;

// Sistemdeki kullanıcıları temsil eden ana tablo.

public class User
{
    // Benzersiz kullanıcı kimliği (Primary Key)
    public Guid Id { get; private set; }

    // Kullanıcının kayıtlı e-posta adresi (Giriş için kullanılır)
    public string Email { get; set; } = string.Empty;

    // Kurumsal e-posta adresi (Doğrulama için zorunlu)
    public string? InstitutionalEmail { get; private set; }

    // Şifrelenmiş parola (Doğrudan saklanmaz, hashlenir)
    public string PasswordHash { get; set; } = string.Empty;

    // Ad ve Soyad
    public string FullName { get; set; } = string.Empty;
    
    // --- Profil Bilgileri ---

    //location eklenebilir

    // Akademik unvan (Örn: Prof. Dr., Arş. Gör.)
    public string? Title { get; set; }

    // Çalıştığı üniversite veya kurum
    public string? Institution { get; set; }

    // Bölüm veya Anabilim Dalı
    public string? Department { get; set; }

    // Kullanıcının kendini tanıttığı kısa biyografi yazısı
    public string? Bio { get; set; }

    // Profil fotoğrafının dosya yolu veya URL'i
    public string? ProfileImageUrl { get; set; }

    // Kapak fotoğrafının dosya yolu veya URL'i
    public string? CoverImageUrl { get; set; }

    // Hesabın doğrulanıp doğrulanmadığı (Mavi tik vb.)
    public bool IsVerified { get; set; }
    
    // --- Ayarlar ---

    // Profil gizlilik seviyesi (Herkese açık, Sadece Bağlantılar, Gizli)
    public PrivacyLevel PrivacyLevel { get; set; } = PrivacyLevel.Public;
    
    // --- İstatistikler ---

    // Bu kullanıcıyı takip eden kişi sayısı
    //!!!!ekstra gerek var mı zaten collection olrk fllowing ve followers tutuyorum.
    public int FollowerCount { get; private set; }

    // Bu kullanıcının takip ettiği kişi sayısı
    public int FollowingCount { get; private set; }

    // Kullanıcının Puanı (Yayınlarının ortalama puanı)
    public double AvgScore { get; private set; }

    // Hesabın oluşturulma tarihi
    public DateTime CreatedAt { get; private set; }
    
    // Kullanıcının yayınladığı makaleler/yayınlar
    public ICollection<Publication> Publications { get; set; } = new List<Publication>();

    // Kullanıcının ilgi alanları (Etiketler)
    public ICollection<UserTag> Tags { get; set; } = new List<UserTag>();

    // Beni takip edenler listesi
    public ICollection<UserFollow> Followers { get; set; } = new List<UserFollow>();

    // Benim takip ettiklerim listesi
    public ICollection<UserFollow> Following { get; set; } = new List<UserFollow>();

    // Kullanıcıya gelen bildirimler.
    //gün ya da sayı sınırlaması koy.
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    // Kullanıcının kaydettiği yayınlar
    public ICollection<SavedPublication> SavedPublications { get; set; } = new List<SavedPublication>();

    // Kullanıcının paylaştığı yayınlar
    public ICollection<PublicationShare> SharedPublications { get; set; } = new List<PublicationShare>();

    public User(string email, string fullName) 
    {
        Id = Guid.NewGuid();
        Email = email;
        FullName = fullName;
        CreatedAt = DateTime.UtcNow;
        FollowerCount = 0;
        FollowingCount = 0;
        AvgScore = 0;
    }

    public void UpdateReputationScore(double newScore)
    {
        AvgScore = newScore;
    }

    public void IncrementFollowerCount() => FollowerCount++;
    public void DecrementFollowerCount() { if (FollowerCount > 0) FollowerCount--; }
    public void IncrementFollowingCount() => FollowingCount++;
    public void DecrementFollowingCount() { if (FollowingCount > 0) FollowingCount--; }



    public void SetInstitutionalEmail(string institutionalEmail)
    {
        InstitutionalEmail = institutionalEmail;
    }
}
