namespace ResearchNetwork.Domain.Entities;

// Kullanıcı ve İlgi Alanı arasındaki Çoktan-Çoka (Many-to-Many) ilişki tablosu.
// Hangi kullanıcının hangi etiketle ilgilendiğini tutar.

public class UserTag
{
    // Kullanıcı ID (Foreign Key)
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // Etiket ID (Foreign Key)
    public Guid TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}
