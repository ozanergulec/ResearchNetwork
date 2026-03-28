using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.Application.Interfaces;

public interface IMessageRepository
{
    Task<(IEnumerable<Message> Messages, int TotalCount)> GetConversationAsync(Guid userId1, Guid userId2, int page, int pageSize);
    Task<IEnumerable<(Guid OtherUserId, Message LastMessage, int UnreadCount)>> GetConversationsAsync(Guid userId);
    Task<Message> SendAsync(Message message);
    Task MarkConversationAsReadAsync(Guid currentUserId, Guid otherUserId);
    Task<int> GetTotalUnreadCountAsync(Guid userId);
}
