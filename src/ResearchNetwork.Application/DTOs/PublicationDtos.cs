namespace ResearchNetwork.Application.DTOs;

public record PublicationDto(
    Guid Id,
    string Title,
    string? Abstract,
    string? DOI,
    DateTime? PublishedDate,
    List<string> Keywords,
    Guid AuthorId,
    DateTime CreatedAt
);

public record CreatePublicationDto(
    string Title,
    string? Abstract,
    string? DOI,
    DateTime? PublishedDate,
    List<string>? Keywords
);
