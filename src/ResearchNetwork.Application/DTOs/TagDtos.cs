namespace ResearchNetwork.Application.DTOs;

public record TagDto(
    Guid Id,
    string Name,
    int UsageCount
);

public record CreateTagDto(
    string Name
);
