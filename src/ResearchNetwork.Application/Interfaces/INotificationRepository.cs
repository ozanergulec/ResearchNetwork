using ResearchNetwork.Domain.Enums;
using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.Application.Interfaces;

public interface INotificationRepository
{
    Task<IEnumerable<Notification>> GetByUserIdAsync(Guid userId);
    Task<int> GetUnreadCountAsync(Guid userId);
    Task AddAsync(Notification notification);
    Task<Notification?> GetLatestUnreadByActorAndTypeAsync(Guid userId, Guid actorId, NotificationType type);
    Task UpdateAsync(Notification notification);
    Task<bool> MarkAsReadAsync(Guid notificationId, Guid userId);
    Task MarkAllAsReadAsync(Guid userId);
    Task<bool> DeleteAsync(Guid notificationId, Guid userId);
}
