namespace ResearchNetwork.Domain.Entities;

/// <summary>
/// Yayın Puanlama Tablosu.
/// Kullanıcıların yayınlara 1-5 arasında puan vermesini sağlar.
/// Bir yayına 100 kişi puan verirse, bu 100 farklı puanın kimden geldiğini ve kaç olduğunu tutmanız gerekir. Tek bir satıra sıkıştırılamaz.
/// "Ahmet bu yayına daha önce oy verdi mi?" kontrolünü ancak bu tablo sayesinde yapabiliriz.
/// </summary>
public class PublicationRating
{
    // Puanlama kaydının benzersiz ID'si
    public Guid Id { get; private set; }

    // Puanlanan Yayın ID (Foreign Key)
    public Guid PublicationId { get; private set; }
    public Publication Publication { get; set; } = null!;

    // Puan Veren Kullanıcı ID (Foreign Key)
    public Guid UserId { get; private set; }
    public User User { get; set; } = null!;

    // Verilen Puan (1-5 arası)
    public int Score { get; private set; }

    // Puanlama Zamanı
    public DateTime CreatedAt { get; private set; }

    public PublicationRating(Guid publicationId, Guid userId, int score)
    {
        if (score < 1 || score > 5)
            throw new ArgumentOutOfRangeException(nameof(score), "Puan 1 ile 5 arasında olmalıdır.");

        Id = Guid.NewGuid();
        PublicationId = publicationId;
        UserId = userId;
        Score = score;
        CreatedAt = DateTime.UtcNow;
    }
}
