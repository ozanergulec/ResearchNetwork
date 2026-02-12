namespace ResearchNetwork.Application.DTOs;

public record UserDto(
    Guid Id,
    string Email,
    string FullName,
    string? Title,
    string? Institution,
    string? Department,
    string? Bio,
    string? ProfileImageUrl,
    string? CoverImageUrl,
    bool IsVerified,
    int FollowerCount,
    int FollowingCount,
    double AvgScore,
    DateTime CreatedAt,
    IEnumerable<TagDto> Tags
);

public record UserSummaryDto(
    Guid Id,
    string FullName,
    string? Title,
    string? Institution,
    string? ProfileImageUrl,
    string? CoverImageUrl,
    bool IsVerified
);

public record UpdateUserProfileDto(
    string FullName,
    string? Title,
    string? Institution,
    string? Department,
    string? Bio,
    string? ProfileImageUrl,
    string? CoverImageUrl
);
