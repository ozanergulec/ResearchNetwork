namespace ResearchNetwork.Domain.Entities;

public class PublicationEmbedding
{
    public Guid Id { get; private set; }
    public Guid PublicationId { get; private set; }
    public float[] Embedding { get; private set; } = Array.Empty<float>();
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    public Publication Publication { get; set; } = null!;

    private PublicationEmbedding() { }

    public PublicationEmbedding(Guid publicationId, float[] embedding)
    {
        Id = Guid.NewGuid();
        PublicationId = publicationId;
        Embedding = embedding;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateEmbedding(float[] newEmbedding)
    {
        Embedding = newEmbedding;
        UpdatedAt = DateTime.UtcNow;
    }
}
