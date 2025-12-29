namespace ResearchNetwork.Application.DTOs;

public record RegisterDto(
    string Email,
    string Password,
    string FullName,
    string? Title = null,
    string? Institution = null,
    string? Department = null
);

public record LoginDto(
    string Email,
    string Password
);

public record AuthResponseDto(
    string Token,
    UserDto User
);
