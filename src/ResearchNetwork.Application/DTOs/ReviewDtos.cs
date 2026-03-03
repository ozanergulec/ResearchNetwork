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
