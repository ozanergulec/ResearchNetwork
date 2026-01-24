namespace ResearchNetwork.Application.DTOs;

public record PublicationDto(
    Guid Id,
    string Title,
    string? Abstract,
    DateTime? PublishedDate,
    List<string> Tags,
    UserSummaryDto Author,
    double AverageRating,
    int CitationCount,
    int SaveCount,
    int ShareCount,
    DateTime CreatedAt
);

public record CreatePublicationDto(
    string Title,
    string? Abstract,
    DateTime? PublishedDate,
    List<string>? Tags
);
