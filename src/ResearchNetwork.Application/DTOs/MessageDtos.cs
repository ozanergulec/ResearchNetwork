namespace ResearchNetwork.Application.DTOs;

public record AttachedPublicationDto(
    Guid Id,
    string Title,
    string? Abstract,
    string AuthorName,
    string? AuthorProfileImageUrl,
    bool AuthorIsVerified,
    double AverageRating,
    int CitationCount,
    string? PublishedDate
);

public record MessageDto(
    Guid Id,
    Guid SenderId,
    string SenderName,
    string? SenderProfileImageUrl,
    Guid ReceiverId,
    string ReceiverName,
    string Content,
    DateTime SentAt,
    bool IsRead,
    AttachedPublicationDto? AttachedPublication
);

public record ConversationDto(
    Guid UserId,
    string UserName,
    string? UserProfileImageUrl,
    bool UserIsVerified,
    string? UserTitle,
    string? UserInstitution,
    string LastMessage,
    DateTime LastMessageAt,
    int UnreadCount
);

public record SendMessageDto(Guid ReceiverId, string Content, Guid? AttachedPublicationId = null);
