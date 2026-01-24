namespace ResearchNetwork.Domain.Entities;

// Yayın ve Etiket arasındaki Çoktan-Çoka (Many-to-Many) ilişki tablosu.
//Bir yayının hangi konularla ilgili olduğunu tutar.

public class PublicationTag
{
    // Yayın ID (Foreign Key)
    public Guid PublicationId { get; set; }
    public Publication Publication { get; set; } = null!;

    // Etiket ID (Foreign Key)
    public Guid TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}
