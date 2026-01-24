namespace ResearchNetwork.Domain.Entities;

// Etiket tablosu.
// Hem kullanıcıların ilgi alanlarını hem de yayınların konularını belirtmek için ortak kullanılır.
// Öneri sistemi bu tablo üzerinden eşleşme yapar.
public class Tag
{
    // Etiketin benzersiz kimliği
    public Guid Id { get; private set; }

    // Etiketin adı 
    public string Name { get; private set; }

    // Etiketin kaç kez kullanıldığı (Popülerlik sıralaması için)???
    public int UsageCount { get; set; } 

    // Oluşturulma tarihi
    public DateTime CreatedAt { get; private set; }

    public Tag(string name) // Etiket oluşturur.
    {
        Id = Guid.NewGuid();
        Name = name;
        CreatedAt = DateTime.UtcNow;
        UsageCount = 0;
    }

    // --- İlişkiler ---

    // Bu etiketi ilgi alanı olarak ekleyen kullanıcılar
    public ICollection<UserTag> UserTags { get; set; } = new List<UserTag>();

    // Bu etiketin eklendiği yayınlar
    public ICollection<PublicationTag> PublicationTags { get; set; } = new List<PublicationTag>();
}
