using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Enums;

namespace ResearchNetwork.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly IUserRepository _userRepository;

    public SettingsController(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    [HttpGet]
    public async Task<ActionResult<UserSettingsDto>> GetSettings()
    {
        var userId = GetUserIdFromClaims();
        if (userId == null) return Unauthorized(new { Message = "User ID not found in token." });

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { Message = "User not found." });

        return Ok(MapToSettingsDto(user));
    }

    // ==================== PROFILE SETTINGS ====================

    [HttpPut("profile")]
    public async Task<ActionResult<UserSettingsDto>> UpdateProfileSettings([FromBody] UpdateProfileSettingsDto dto)
    {
        var userId = GetUserIdFromClaims();
        if (userId == null) return Unauthorized(new { Message = "User ID not found in token." });

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { Message = "User not found." });

        if (!string.IsNullOrWhiteSpace(dto.FullName)) user.FullName = dto.FullName;
        if (dto.Title != null) user.Title = dto.Title;
        if (dto.Institution != null) user.Institution = dto.Institution;
        if (dto.Department != null) user.Department = dto.Department;
        if (dto.Bio != null) user.Bio = dto.Bio;

        await _userRepository.UpdateAsync(user);

        return Ok(MapToSettingsDto(user));
    }

    // ==================== PASSWORD CHANGE ====================

    [HttpPut("password")]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userId = GetUserIdFromClaims();
        if (userId == null) return Unauthorized(new { Message = "User ID not found in token." });

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { Message = "User not found." });

        // Mevcut şifreyi doğrula
        if (string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(new { Message = "Current password is incorrect." });
        }

        // Yeni şifre validasyonu
        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
        {
            return BadRequest(new { Message = "New password must be at least 6 characters." });
        }

        // Yeni şifreyi hashle ve kaydet
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _userRepository.UpdateAsync(user);

        return Ok(new { Message = "Password changed successfully." });
    }

    // ==================== EMAIL CHANGE ====================

    [HttpPut("email")]
    public async Task<ActionResult> ChangeEmail([FromBody] ChangeEmailDto dto)
    {
        var userId = GetUserIdFromClaims();
        if (userId == null) return Unauthorized(new { Message = "User ID not found in token." });

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { Message = "User not found." });

        // Şifre doğrulama
        if (string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return BadRequest(new { Message = "Password is incorrect." });
        }

        // Yeni e-posta daha önce kayıtlı mı kontrol et
        if (await _userRepository.ExistsAsync(dto.NewEmail))
        {
            return BadRequest(new { Message = "This email address is already registered." });
        }

        // E-posta güncelle
        user.Email = dto.NewEmail;
        user.IsVerified = false; // Yeni e-posta doğrulanana kadar
        await _userRepository.UpdateAsync(user);

        return Ok(new { Message = "Email address updated. Please verify your new email address." });
    }

    // ==================== PRIVACY SETTINGS ====================

    [HttpPut("privacy")]
    public async Task<ActionResult<UserSettingsDto>> UpdatePrivacySettings([FromBody] UpdatePrivacySettingsDto dto)
    {
        var userId = GetUserIdFromClaims();
        if (userId == null) return Unauthorized(new { Message = "User ID not found in token." });

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { Message = "User not found." });

        user.PrivacyLevel = dto.PrivacyLevel;
        await _userRepository.UpdateAsync(user);

        return Ok(MapToSettingsDto(user));
    }

    // ==================== NOTIFICATION SETTINGS ====================

    [HttpPut("notifications")]
    public async Task<ActionResult<UserSettingsDto>> UpdateNotificationSettings([FromBody] UpdateNotificationSettingsDto dto)
    {
        var userId = GetUserIdFromClaims();
        if (userId == null) return Unauthorized(new { Message = "User ID not found in token." });

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { Message = "User not found." });

        user.NotificationsEnabled = dto.NotificationsEnabled;
        user.EmailNotificationsEnabled = dto.EmailNotificationsEnabled;
        await _userRepository.UpdateAsync(user);

        return Ok(MapToSettingsDto(user));
    }

    // ==================== LANGUAGE SETTINGS ====================

    [HttpPut("language")]
    public async Task<ActionResult<UserSettingsDto>> UpdateLanguage([FromBody] UpdateLanguageDto dto)
    {
        var userId = GetUserIdFromClaims();
        if (userId == null) return Unauthorized(new { Message = "User ID not found in token." });

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { Message = "User not found." });

        if (string.IsNullOrWhiteSpace(dto.Language))
        {
            return BadRequest(new { Message = "Language preference cannot be empty." });
        }

        user.Language = dto.Language;
        await _userRepository.UpdateAsync(user);

        return Ok(MapToSettingsDto(user));
    }

    // ==================== DELETE ACCOUNT ====================

    [HttpDelete("account")]
    public async Task<ActionResult> DeleteAccount()
    {
        var userId = GetUserIdFromClaims();
        if (userId == null) return Unauthorized(new { Message = "User ID not found in token." });

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { Message = "User not found." });

        await _userRepository.DeleteAsync(userId.Value);

        return Ok(new { Message = "Your account has been deleted successfully." });
    }

    // ==================== HELPERS ====================

    private Guid? GetUserIdFromClaims()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                       ?? User.FindFirst("sub")?.Value;
        
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }

        return null;
    }

    private static UserSettingsDto MapToSettingsDto(Domain.Entities.User user)
    {
        return new UserSettingsDto(
            user.FullName,
            user.Email,
            user.Title,
            user.Institution,
            user.Department,
            user.Bio,
            user.ProfileImageUrl,
            user.IsVerified,
            user.PrivacyLevel,
            user.Language,
            user.NotificationsEnabled,
            user.EmailNotificationsEnabled,
            user.CreatedAt
        );
    }
}
