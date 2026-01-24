using System;

namespace ResearchNetwork.Domain.Entities;

// Hangi kullanıcının hangi yayını kaydettiği bilgisi.
public class SavedPublication
{
    public Guid UserId { get; private set; }
    public User User { get; set; } = null!;

    public Guid PublicationId { get; private set; }
    public Publication Publication { get; set; } = null!;

    public DateTime SavedAt { get; private set; }

    public SavedPublication(Guid userId, Guid publicationId)
    {
        UserId = userId;
        PublicationId = publicationId;
        SavedAt = DateTime.UtcNow;
    }
}
