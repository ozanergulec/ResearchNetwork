using ResearchNetwork.Domain.Enums;

namespace ResearchNetwork.Application.DTOs;

public record NotificationDto(
    Guid Id,
    string Title,
    string Message,
    string? TargetUrl,
    NotificationType Type,
    bool IsRead,
    DateTime CreatedAt
);
