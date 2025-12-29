namespace ResearchNetwork.Application.DTOs;

public record UserDto(
    Guid Id,
    string Email,
    string FullName,
    string? Title,
    string? Institution,
    string? Department,
    string? Bio,
    List<string> InterestTags,
    DateTime CreatedAt
);

public record UpdateUserDto(
    string? FullName,
    string? Title,
    string? Institution,
    string? Department,
    string? Bio,
    List<string>? InterestTags
);
