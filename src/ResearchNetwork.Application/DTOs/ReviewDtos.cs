namespace ResearchNetwork.Application.DTOs;

public record ReviewRequestDto(
    Guid Id,
    Guid PublicationId,
    string PublicationTitle,
    UserSummaryDto Author,
    UserSummaryDto Reviewer,
    string Status,
    string? Message,
    string? ReviewComment,
    string? Verdict,
    int? ReviewScore,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public record CreateReviewRequestDto(
    string? Message
);

public record SubmitReviewDto(
    string ReviewComment,
    string Verdict  // "Approve", "MinorRevision", "MajorRevision", "Reject"
);

public record RateReviewDto(
    int Score  // 1-5
);

public record SuggestedReviewerDto(
    Guid UserId,
    string FullName,
    string? Title,
    string? Institution,
    string? Department,
    string? ProfileImageUrl,
    bool IsVerified,
    double Similarity,
    List<string> CommonTags,
    int CompletedReviews,
    bool IsRecommended
);

public record SendReviewInvitationDto(
    Guid ReviewerId
);
