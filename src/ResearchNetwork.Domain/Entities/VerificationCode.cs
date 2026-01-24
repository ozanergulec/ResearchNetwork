using ResearchNetwork.Domain.Enums;

namespace ResearchNetwork.Domain.Entities;
// E-posta doğrulama veya şifre sıfırlama işlemlerinde gönderilen geçici kodları tutar.
public class VerificationCode
{
    // Kaydın benzersiz kimliği
    public Guid Id { get; private set; }

    // Gönderilen kod 
    public string Code { get; private set; }

    // Kodun geçerlilik süresinin bitiş tarihi
    public DateTime ExpiresAt { get; private set; }

    // Kodun kullanılıp kullanılmadığı
    public bool IsUsed { get; private set; }

    // Kodun kullanım amacı (e-posta için mi şifre için mi?)
    public VerificationType Type { get; private set; }

    // Oluşturulma tarihi
    public DateTime CreatedAt { get; private set; }

    // Kodu talep eden kullanıcı ID'si (Foreign Key)
    public Guid UserId { get; private set; }
    public User User { get; set; } = null!;

    public VerificationCode(Guid userId, string code, DateTime expiresAt, VerificationType type)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        Code = code;
        ExpiresAt = expiresAt;
        Type = type;
        CreatedAt = DateTime.UtcNow;
        IsUsed = false;
    }

   //kod kullanıldı olarak işaretlenir.
    public void MarkAsUsed()
    {
        IsUsed = true;
    }
}
