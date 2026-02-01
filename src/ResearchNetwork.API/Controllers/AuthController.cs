using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;
using ResearchNetwork.Domain.Enums;

namespace ResearchNetwork.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IVerificationCodeRepository _verificationCodeRepository;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;

    // Kabul edilen akademik email domain'leri
    private static readonly string[] AcademicDomains = { ".edu.tr", ".ac.uk", ".edu" };

    public AuthController(
        IUserRepository userRepository,
        IVerificationCodeRepository verificationCodeRepository,
        IEmailService emailService,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _verificationCodeRepository = verificationCodeRepository;
        _emailService = emailService;
        _configuration = configuration;
    }

    [HttpPost("register")]
    public async Task<ActionResult<RegisterResponseDto>> Register([FromBody] RegisterDto dto)
    {
        // Akademik email domain kontrolü
        if (!IsAcademicEmail(dto.Email))
        {
            return BadRequest(new { Message = "Sadece akademik email adresleri (.edu.tr, .ac.uk, .edu) kabul edilmektedir." });
        }

        if (await _userRepository.ExistsAsync(dto.Email))
        {
            return BadRequest(new { Message = "Bu email adresi zaten kayıtlı." });
        }

        var user = new User(dto.Email, dto.FullName);
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        user.IsVerified = false; // Email doğrulanana kadar false
        
        // Optional alanları ata
        if (!string.IsNullOrWhiteSpace(dto.Title))
            user.Title = dto.Title;
        if (!string.IsNullOrWhiteSpace(dto.Institution))
            user.Institution = dto.Institution;
        if (!string.IsNullOrWhiteSpace(dto.Department))
            user.Department = dto.Department;

        await _userRepository.CreateAsync(user);

        // 6 haneli doğrulama kodu oluştur
        var verificationCode = GenerateVerificationCode();
        var codeEntity = new VerificationCode(
            user.Id,
            verificationCode,
            DateTime.UtcNow.AddMinutes(15), // 15 dakika geçerli
            VerificationType.EmailVerification
        );

        await _verificationCodeRepository.CreateAsync(codeEntity);

        // Email gönder
        try
        {
            await _emailService.SendVerificationEmailAsync(dto.Email, verificationCode);
        }
        catch (Exception)
        {
            // Email gönderilemese bile kayıt başarılı sayılsın, tekrar gönderme seçeneği var
        }

        return Ok(new RegisterResponseDto(
            user.Id,
            user.Email,
            "Doğrulama kodu email adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.",
            false
        ));
    }

    [HttpPost("verify-email")]
    public async Task<ActionResult<AuthResponseDto>> VerifyEmail([FromBody] VerifyEmailDto dto)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email);
        if (user == null)
        {
            return BadRequest(new { Message = "Kullanıcı bulunamadı." });
        }

        if (user.IsVerified)
        {
            return BadRequest(new { Message = "Bu email adresi zaten doğrulanmış." });
        }

        var verificationCode = await _verificationCodeRepository.GetByCodeAsync(dto.Code);
        if (verificationCode == null || verificationCode.UserId != user.Id)
        {
            return BadRequest(new { Message = "Geçersiz veya süresi dolmuş doğrulama kodu." });
        }

        // Kodu kullanıldı olarak işaretle
        verificationCode.MarkAsUsed();
        await _verificationCodeRepository.UpdateAsync(verificationCode);

        // Kullanıcıyı doğrulanmış olarak işaretle
        user.IsVerified = true;
        await _userRepository.UpdateAsync(user);

        // JWT token oluştur ve döndür
        var token = GenerateJwtToken(user);
        var userDto = MapToUserDto(user);

        return Ok(new AuthResponseDto(token, userDto));
    }

    [HttpPost("resend-code")]
    public async Task<ActionResult> ResendVerificationCode([FromBody] ResendCodeDto dto)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email);
        if (user == null)
        {
            return BadRequest(new { Message = "Kullanıcı bulunamadı." });
        }

        if (user.IsVerified)
        {
            return BadRequest(new { Message = "Bu email adresi zaten doğrulanmış." });
        }

        // Yeni kod oluştur
        var verificationCode = GenerateVerificationCode();
        var codeEntity = new VerificationCode(
            user.Id,
            verificationCode,
            DateTime.UtcNow.AddMinutes(15),
            VerificationType.EmailVerification
        );

        await _verificationCodeRepository.CreateAsync(codeEntity);

        // Email gönder
        try
        {
            await _emailService.SendVerificationEmailAsync(dto.Email, verificationCode);
            return Ok(new { Message = "Yeni doğrulama kodu gönderildi." });
        }
        catch (Exception)
        {
            return StatusCode(500, new { Message = "Email gönderilemedi. Lütfen daha sonra tekrar deneyin." });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email);

        if (user == null)
        {
            return Unauthorized(new { Message = "Geçersiz email veya şifre." });
        }
        
        if (string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return Unauthorized(new { Message = "Geçersiz email veya şifre." });
        }

        // Email doğrulanmamışsa uyar
        if (!user.IsVerified)
        {
            return Unauthorized(new { 
                Message = "Email adresiniz henüz doğrulanmamış. Lütfen email adresinize gönderilen kodu girin.",
                RequiresVerification = true,
                Email = user.Email
            });
        }

        var token = GenerateJwtToken(user);
        var userDto = MapToUserDto(user);

        return Ok(new AuthResponseDto(token, userDto));
    }

    // Şifremi unuttum - İlk adım: Email ile istek gönderme
    [HttpPost("forgot-password")]
    public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email);
        if (user == null)
        {
            // Güvenlik için kullanıcı bulunamasa bile aynı mesajı döndür
            return Ok(new { Message = "If your email is registered, you will receive a password reset code." });
        }

        // Yeni kod oluştur
        var verificationCode = GenerateVerificationCode();
        var codeEntity = new VerificationCode(
            user.Id,
            verificationCode,
            DateTime.UtcNow.AddMinutes(15),
            VerificationType.PasswordReset
        );

        await _verificationCodeRepository.CreateAsync(codeEntity);

        // Email gönder
        try
        {
            await _emailService.SendPasswordResetEmailAsync(dto.Email, verificationCode);
        }
        catch (Exception)
        {
            // Email gönderilemese bile güvenlik için aynı mesajı döndür
        }

        return Ok(new { Message = "If your email is registered, you will receive a password reset code." });
    }

    // Şifremi unuttum - İkinci adım: Kodu doğrulama
    [HttpPost("verify-reset-code")]
    public async Task<ActionResult> VerifyResetCode([FromBody] VerifyResetCodeDto dto)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email);
        if (user == null)
        {
            return BadRequest(new { Message = "Invalid email or code." });
        }

        var verificationCode = await _verificationCodeRepository.GetByCodeAsync(dto.Code);
        if (verificationCode == null || 
            verificationCode.UserId != user.Id || 
            verificationCode.Type != VerificationType.PasswordReset ||
            verificationCode.IsUsed)
        {
            return BadRequest(new { Message = "Invalid or expired code." });
        }

        return Ok(new { Message = "Code verified successfully.", Valid = true });
    }

    // Şifremi unuttum - Üçüncü adım: Yeni şifre belirleme
    [HttpPost("reset-password")]
    public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email);
        if (user == null)
        {
            return BadRequest(new { Message = "Invalid email or code." });
        }

        var verificationCode = await _verificationCodeRepository.GetByCodeAsync(dto.Code);
        if (verificationCode == null || 
            verificationCode.UserId != user.Id || 
            verificationCode.Type != VerificationType.PasswordReset ||
            verificationCode.IsUsed)
        {
            return BadRequest(new { Message = "Invalid or expired code." });
        }

        // Kodu kullanıldı olarak işaretle
        verificationCode.MarkAsUsed();
        await _verificationCodeRepository.UpdateAsync(verificationCode);

        // Yeni şifreyi hashle ve kaydet
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _userRepository.UpdateAsync(user);

        return Ok(new { Message = "Password reset successfully. You can now login with your new password." });
    }

    private static bool IsAcademicEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return false;

        var lowerEmail = email.ToLowerInvariant();
        return AcademicDomains.Any(domain => lowerEmail.EndsWith(domain));
    }

    private static string GenerateVerificationCode()
    {
        var random = new Random();
        return random.Next(100000, 999999).ToString();
    }

    private string GenerateJwtToken(User user)
    {
        var key = _configuration["Jwt:Key"] ?? "DefaultSecretKeyForDevelopment123456";
        var issuer = _configuration["Jwt:Issuer"] ?? "ResearchNetwork";
        var expirationDays = int.Parse(_configuration["Jwt:ExpirationInDays"] ?? "7");

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Name, user.FullName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: issuer,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(expirationDays),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static UserDto MapToUserDto(User user)
    {
        return new UserDto(
            user.Id,
            user.Email,
            user.FullName,
            user.Title,
            user.Institution,
            user.Department,
            user.Bio,
            user.ProfileImageUrl,
            user.IsVerified,
            user.FollowerCount,
            user.FollowingCount,
            user.AvgScore,
            user.CreatedAt,
            new List<TagDto>() // AuthController doesn't load tags
        );
    }
}
