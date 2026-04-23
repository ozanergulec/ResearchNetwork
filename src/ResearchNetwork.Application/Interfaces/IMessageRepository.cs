using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.Application.Interfaces;

public interface IMessageRepository
{
    Task<(IEnumerable<Message> Messages, int TotalCount)> GetConversationAsync(Guid userId1, Guid userId2, int page, int pageSize);
    Task<IEnumerable<ConversationSummary>> GetConversationsAsync(Guid userId);
    Task<Message> SendAsync(Message message);
    Task MarkConversationAsReadAsync(Guid currentUserId, Guid otherUserId);
    Task<int> GetTotalUnreadCountAsync(Guid userId);
}
