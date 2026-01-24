namespace ResearchNetwork.Domain.Entities;

//Yayınlara yapılan yorumları tutan tablo.

public class PublicationComment
{
    public Guid Id { get; private set; }

    // Yorum yapılan Yayın
    public Guid PublicationId { get; private set; }
    public Publication Publication { get; set; } = null!;

    // Yorumu yapan kullanıcı
    public Guid UserId { get; private set; }
    public User User { get; set; } = null!;

    // Yorum içeriği
    public string Content { get; private set; }

    // Yorum Tarihi
    public DateTime CreatedAt { get; private set; }

    public PublicationComment(Guid publicationId, Guid userId, string content)
    {
        Id = Guid.NewGuid();
        PublicationId = publicationId;
        UserId = userId;
        Content = content;
        CreatedAt = DateTime.UtcNow;
    }
}
