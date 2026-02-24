using ResearchNetwork.Domain.Enums;

namespace ResearchNetwork.Application.DTOs;

// Tüm ayarları döndüren DTO
public record UserSettingsDto(
    // Profil bilgileri
    string FullName,
    string Email,
    string? Title,
    string? Institution,
    string? Department,
    string? Bio,
    string? ProfileImageUrl,
    bool IsVerified,
    
    // Gizlilik
    PrivacyLevel PrivacyLevel,
    
    // Tercihler
    string Language,
    bool NotificationsEnabled,
    bool EmailNotificationsEnabled,
    
    // Hesap bilgileri
    DateTime CreatedAt
);

// Profil bilgilerini güncelleme (Ad, sektör, unvan)
public record UpdateProfileSettingsDto(
    string? FullName,
    string? Title,
    string? Institution,
    string? Department,
    string? Bio
);

// Şifre değiştirme
public record ChangePasswordDto(
    string CurrentPassword,
    string NewPassword
);

// E-posta değiştirme
public record ChangeEmailDto(
    string NewEmail,
    string Password // Güvenlik için mevcut şifre gerekli
);

// Gizlilik ayarları güncelleme
public record UpdatePrivacySettingsDto(
    PrivacyLevel PrivacyLevel
);

// Bildirim tercihleri güncelleme
public record UpdateNotificationSettingsDto(
    bool NotificationsEnabled,
    bool EmailNotificationsEnabled
);

// Dil tercihi güncelleme
public record UpdateLanguageDto(
    string Language
);
