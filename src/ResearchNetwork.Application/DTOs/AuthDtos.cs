namespace ResearchNetwork.Application.DTOs;

public record LoginDto(
    string Email,
    string Password
);

public record RegisterDto(
    string FullName,
    string Email,
    string Password,
    string Title,
    string Institution,
    string Department
);

public record AuthResponseDto(
    string Token,
    UserDto User
);

public record RegisterResponseDto(
    Guid UserId,
    string Email,
    string Message,
    bool IsVerified
);

public record VerifyEmailDto(
    string Email,
    string Code
);

public record ResendCodeDto(
    string Email
);

// Şifremi unuttum akışı için DTO'lar
public record ForgotPasswordDto(
    string Email
);

public record VerifyResetCodeDto(
    string Email,
    string Code
);

public record ResetPasswordDto(
    string Email,
    string Code,
    string NewPassword
);
