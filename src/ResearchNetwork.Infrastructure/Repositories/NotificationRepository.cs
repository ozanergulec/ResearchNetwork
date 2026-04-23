using Microsoft.EntityFrameworkCore;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;
using ResearchNetwork.Domain.Enums;
using ResearchNetwork.Infrastructure.Data;

namespace ResearchNetwork.Infrastructure.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly AppDbContext _context;

    public NotificationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Notification>> GetByUserIdAsync(Guid userId)
    {
        return await _context.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .ToListAsync();
    }

    public async Task<int> GetUnreadCountAsync(Guid userId)
    {
        return await _context.Notifications
            .CountAsync(n => n.UserId == userId && !n.IsRead);
    }

    public async Task AddAsync(Notification notification)
    {
        await _context.Notifications.AddAsync(notification);
        await _context.SaveChangesAsync();
    }

    public async Task<Notification?> GetLatestUnreadByActorAndTypeAsync(Guid userId, Guid actorId, NotificationType type)
    {
        return await _context.Notifications
            .Where(n => n.UserId == userId
                && !n.IsRead
                && n.ActorId == actorId
                && n.Type == type)
            .OrderByDescending(n => n.CreatedAt)
            .FirstOrDefaultAsync();
    }

    public async Task UpdateAsync(Notification notification)
    {
        _context.Notifications.Update(notification);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> MarkAsReadAsync(Guid notificationId, Guid userId)
    {
        var notification = await _context.Notifications.FindAsync(notificationId);
        if (notification == null || notification.UserId != userId)
            return false;

        notification.MarkAsRead();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task MarkAllAsReadAsync(Guid userId)
    {
        await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
    }

    public async Task<bool> DeleteAsync(Guid notificationId, Guid userId)
    {
        var notification = await _context.Notifications.FindAsync(notificationId);
        if (notification == null || notification.UserId != userId)
            return false;

        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync();
        return true;
    }
}
