using System.Text.Json;

namespace ResearchNetwork.Domain.Entities;

public class CitationAnalysisEntry
{
    public string Sentence { get; set; } = string.Empty;
    public List<int> CitationNumbers { get; set; } = new();
    public string Intent { get; set; } = string.Empty;
    public double Confidence { get; set; }
}

public class CitationAnalysis
{
    public Guid Id { get; private set; }
    public Guid PublicationId { get; private set; }
    public string ItemsJson { get; private set; } = "[]";
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    public Publication Publication { get; set; } = null!;

    private CitationAnalysis() { }

    public CitationAnalysis(Guid publicationId, List<CitationAnalysisEntry> items)
    {
        Id = Guid.NewGuid();
        PublicationId = publicationId;
        ItemsJson = JsonSerializer.Serialize(items);
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public List<CitationAnalysisEntry> GetItems()
    {
        return JsonSerializer.Deserialize<List<CitationAnalysisEntry>>(ItemsJson)
               ?? new List<CitationAnalysisEntry>();
    }

    public void Update(List<CitationAnalysisEntry> items)
    {
        ItemsJson = JsonSerializer.Serialize(items);
        UpdatedAt = DateTime.UtcNow;
    }
}
