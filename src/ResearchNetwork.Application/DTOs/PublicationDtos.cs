namespace ResearchNetwork.Application.DTOs;

public record PublicationDto(
    Guid Id,
    string Title,
    string? Abstract,
    string? DOI,
    string? FileUrl,
    DateTime? PublishedDate,
    List<string> Tags,
    UserSummaryDto Author,
    double AverageRating,
    int CitationCount,
    int SaveCount,
    int ShareCount,
    DateTime CreatedAt,
    bool IsSaved = false,
    bool IsShared = false,
    int? UserRating = null
);

public record CreatePublicationDto(
    string Title,
    string? Abstract,
    string? DOI,
    string? FileUrl,
    DateTime? PublishedDate,
    List<string>? Tags
);

public record RatePublicationDto(
    int Score
);

public record SharePublicationDto(
    string? Note
);

public record SharedPublicationDto(
    Guid ShareId,
    UserSummaryDto SharedBy,
    string? Note,
    DateTime SharedAt,
    PublicationDto Publication
);

public record FeedItemDto(
    string Type,  // "publication" or "share"
    PublicationDto? Publication,
    SharedPublicationDto? SharedPublication
);

public record PagedResult<T>(
    IEnumerable<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    bool HasMore
);
