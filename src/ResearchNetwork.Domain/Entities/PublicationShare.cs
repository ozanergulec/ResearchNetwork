using System;

namespace ResearchNetwork.Domain.Entities;

// Bir kullanıcının bir yayını paylaşması (Repost/Share).
public class PublicationShare
{
    public Guid Id { get; private set; }

    // Paylaşan kullanıcı
    public Guid UserId { get; private set; }
    public User User { get; set; } = null!;

    // Paylaşılan yayın
    public Guid PublicationId { get; private set; }
    public Publication Publication { get; set; } = null!;

    public DateTime SharedAt { get; private set; }
    
    // Paylaşırken eklenen not/yorum (Opsiyonel)
    public string? Note { get; private set; }

    public PublicationShare(Guid userId, Guid publicationId, string? note = null)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        PublicationId = publicationId;
        Note = note;
        SharedAt = DateTime.UtcNow;
    }

    public void UpdateNote(string? note)
    {
        Note = note;
    }
}
