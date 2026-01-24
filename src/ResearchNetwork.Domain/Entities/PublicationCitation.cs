namespace ResearchNetwork.Domain.Entities;


//Alıntı (Atıf) tablosu.
//Bir kullanıcının bir yayını alıntıladığını belirtir.

public class PublicationCitation
{
    public Guid Id { get; private set; }

    // Alıntılanan Yayın
    public Guid PublicationId { get; private set; }
    public Publication Publication { get; set; } = null!;

    // Alıntılayan (Atıf yapan) Kullanıcı
    public Guid UserId { get; private set; }
    public User User { get; set; } = null!;

    // Atıf Tarihi
    public DateTime CreatedAt { get; private set; }

    public PublicationCitation(Guid publicationId, Guid userId)
    {
        Id = Guid.NewGuid();
        PublicationId = publicationId;
        UserId = userId;
        CreatedAt = DateTime.UtcNow;
    }
}
