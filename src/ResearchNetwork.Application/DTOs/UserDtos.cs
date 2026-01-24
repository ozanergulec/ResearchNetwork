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
    bool IsVerified,
    int FollowerCount,
    int FollowingCount,
    double AvgScore,
    DateTime CreatedAt
);

public record UserSummaryDto(
    Guid Id,
    string FullName,
    string? Title,
    string? Institution,
    string? ProfileImageUrl,
    bool IsVerified
);

public record UpdateUserProfileDto(
    string FullName,
    string? Title,
    string? Institution,
    string? Department,
    string? Bio,
    string? ProfileImageUrl
);
