namespace ResearchNetwork.Application.DTOs;

public record PublicationCommentDto(
    Guid Id,
    Guid PublicationId,
    UserSummaryDto User,
    string Content,
    DateTime CreatedAt
);

public record CreatePublicationCommentDto(
    Guid PublicationId,
    string Content
);

public record PublicationRatingDto(
    Guid Id,
    Guid PublicationId,
    Guid UserId,
    int Score,
    DateTime CreatedAt
);

public record CreatePublicationRatingDto(
    Guid PublicationId,
    int Score
);

public record PublicationShareDto(
    Guid Id,
    Guid PublicationId,
    UserSummaryDto User,
    string? Note,
    DateTime SharedAt
);

public record CreatePublicationShareDto(
    Guid PublicationId,
    string? Note
);
