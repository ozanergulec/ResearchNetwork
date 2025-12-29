namespace ResearchNetwork.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Institution { get; set; }
    public string? Department { get; set; }
    public string? Bio { get; set; }
    public List<string> InterestTags { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation property
    public ICollection<Publication> Publications { get; set; } = new List<Publication>();
}
