using ResearchNetwork.Domain.Enums;

namespace ResearchNetwork.Domain.Entities;

public class ReviewRequest
{
    public Guid Id { get; private set; }

    // The publication being reviewed
    public Guid PublicationId { get; private set; }
    public Publication Publication { get; set; } = null!;

    // The reviewer (volunteer)
    public Guid ReviewerId { get; private set; }
    public User Reviewer { get; set; } = null!;

    // Current status of the review request
    public ReviewRequestStatus Status { get; set; }

    // Reviewer's application message
    public string? Message { get; set; }

    // The actual review content (filled when reviewer submits)
    public string? ReviewComment { get; set; }

    // Reviewer's verdict (filled when reviewer submits)
    public ReviewVerdict? Verdict { get; set; }

    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; set; }

    private ReviewRequest() { }

    public ReviewRequest(Guid publicationId, Guid reviewerId, string? message = null)
    {
        Id = Guid.NewGuid();
        PublicationId = publicationId;
        ReviewerId = reviewerId;
        Status = ReviewRequestStatus.Pending;
        Message = message;
        CreatedAt = DateTime.UtcNow;
    }

    public void Accept()
    {
        Status = ReviewRequestStatus.Accepted;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reject()
    {
        Status = ReviewRequestStatus.Rejected;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SubmitReview(string reviewComment, ReviewVerdict verdict)
    {
        ReviewComment = reviewComment;
        Verdict = verdict;
        Status = ReviewRequestStatus.Completed;
        UpdatedAt = DateTime.UtcNow;
    }
}
