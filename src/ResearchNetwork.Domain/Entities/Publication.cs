namespace ResearchNetwork.Domain.Entities;

// Akademik yayınları temsil eden tablo.
public class Publication
{
    // Yayının benzersiz kimliği
    public Guid Id { get; private set; }

    // Yayının başlığı
    public string Title { get; set; } = string.Empty;

    // Özet (Abstract) metni
    public string? Abstract { get; set; }

    // DOI numarası (Digital Object Identifier)
    public string? DOI { get; set; }

    // Yüklenen dosyanın yolu (PDF veya Word)
    public string? FileUrl { get; set; }

    // Tam yayınlanma tarihi (Gün/Ay/Yıl)
    public DateTime? PublishedDate { get; set; }

    // Sisteme eklenme tarihi
    public DateTime CreatedAt { get; private set; }
    
    // --- İlişkiler ---

    // Yazarı (User tablosuna Foreign Key)
    public Guid AuthorId { get; private set; }
    
    // Yazarın kendisi (Navigation Property)
    public User Author { get; set; } = null!;

    // Yayına ait etiketler/anahtar kelimeler
    public ICollection<PublicationTag> Tags { get; set; } = new List<PublicationTag>();

    // Yayına yapılan puanlamalar
    public ICollection<PublicationRating> Ratings { get; set; } = new List<PublicationRating>();

    // Yayına yapılan yorumlar
    public ICollection<PublicationComment> Comments { get; set; } = new List<PublicationComment>();

    // Bu yayını alıntılayanlar
    public ICollection<PublicationCitation> Citations { get; set; } = new List<PublicationCitation>();

    // Bu yayını kaydedenler
    public ICollection<SavedPublication> SavedByUsers { get; set; } = new List<SavedPublication>();

    // Bu yayını paylaşanlar
    public ICollection<PublicationShare> Shares { get; set; } = new List<PublicationShare>();

    // Yayının Ortalama Puanı
    public double AverageRating { get; private set; }

    // Alıntılanma Sayısı
    public int CitationCount { get; private set; }

    // Kaydedilme Sayısı
    public int SaveCount { get; private set; }

    // Paylaşılma Sayısı
    public int ShareCount { get; private set; }

    private Publication() { }

    public Publication(Guid authorId, string title, int publicationYear)
    {
        Id = Guid.NewGuid();
        AuthorId = authorId;
        Title = title;
        PublishedDate = new DateTime(publicationYear, 1, 1);
        CreatedAt = DateTime.UtcNow;
        AverageRating = 0;
        CitationCount = 0;
        SaveCount = 0;
        ShareCount = 0;
    }

    public void UpdateAverageRating(double newRating)
    {
        AverageRating = newRating;
    }

    public void IncrementCitationCount()
    {
        CitationCount++;
    }

    public void DecrementCitationCount()
    {
        if(CitationCount > 0) CitationCount--;
    }

    public void IncrementSaveCount()
    {
        SaveCount++;
    }

    public void DecrementSaveCount()
    {
        if(SaveCount > 0) SaveCount--;
    }

    public void IncrementShareCount()
    {
        ShareCount++;
    }

    public void DecrementShareCount()
    {
        if(ShareCount > 0) ShareCount--;
    }
}
