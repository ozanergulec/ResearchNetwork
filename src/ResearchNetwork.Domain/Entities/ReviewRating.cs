namespace ResearchNetwork.Domain.Entities;

/// <summary>
/// Publication author's rating of a completed review (1-5).
/// One rating per review request.
/// </summary>
public class ReviewRating
{
    public Guid Id { get; private set; }

    // The review being rated
    public Guid ReviewRequestId { get; private set; }
    public ReviewRequest ReviewRequest { get; set; } = null!;

    // The user who gave the rating (publication author)
    public Guid RatedByUserId { get; private set; }
    public User RatedByUser { get; set; } = null!;

    // Score 1-5
    public int Score { get; private set; }

    public DateTime CreatedAt { get; private set; }

    private ReviewRating() { }

    public ReviewRating(Guid reviewRequestId, Guid ratedByUserId, int score)
    {
        if (score < 1 || score > 5)
            throw new ArgumentOutOfRangeException(nameof(score), "Score must be between 1 and 5.");

        Id = Guid.NewGuid();
        ReviewRequestId = reviewRequestId;
        RatedByUserId = ratedByUserId;
        Score = score;
        CreatedAt = DateTime.UtcNow;
    }
}
