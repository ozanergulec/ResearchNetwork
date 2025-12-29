namespace ResearchNetwork.Domain.Entities;

public class Publication
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Abstract { get; set; }
    public string? DOI { get; set; }
    public DateTime? PublishedDate { get; set; }
    public List<string> Keywords { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Foreign key
    public Guid AuthorId { get; set; }
    public User Author { get; set; } = null!;
}
