namespace ResearchNetwork.Application.DTOs;

public record LoginDto(
    string Email,
    string Password
);

public record RegisterDto(
    string FullName,
    string Email,
    string Password,
    string? Title = null,
    string? Institution = null,
    string? Department = null
);

public record AuthResponseDto(
    string Token,
    UserDto User
);

public record VerifyEmailDto(
    string Email,
    string Code
);
