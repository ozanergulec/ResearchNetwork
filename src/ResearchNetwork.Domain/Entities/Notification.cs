using ResearchNetwork.Domain.Enums;

namespace ResearchNetwork.Domain.Entities;

public class Notification
{
    // Bildirimin benzersiz kimliği
    public Guid Id { get; private set; }

    //bildirim başlığı
    public string Title { get; private set; }

    // Bildirim detayı
    public string Message { get; private set; }

    // Tıklanınca gidilecek sayfa adresi (Opsiyonel)
    public string? TargetUrl { get; private set; }

    // Bildirim Tipi
    public NotificationType Type { get; private set; }

    // Okunup okunmadığı bilgisi
    public bool IsRead { get; set; }

    // Oluşturulma tarihi
    public DateTime CreatedAt { get; private set; }

    // Bildirimin sahibi olan kullanıcı ID'si (Foreign Key)
    public Guid UserId { get; private set; }
    public User User { get; set; } = null!;

    public Notification(Guid userId, string title, string message, NotificationType type, string? targetUrl = null)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        Title = title;
        Message = message;
        Type = type;
        TargetUrl = targetUrl;
        CreatedAt = DateTime.UtcNow;
        IsRead = false;
    }

   //bildirimi okundu olarak işaretler.
    public void MarkAsRead()
    {
        IsRead = true;
    }
}
