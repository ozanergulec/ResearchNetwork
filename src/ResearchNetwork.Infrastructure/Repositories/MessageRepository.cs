using Microsoft.EntityFrameworkCore;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;
using ResearchNetwork.Infrastructure.Data;

namespace ResearchNetwork.Infrastructure.Repositories;

public class MessageRepository : IMessageRepository
{
    private readonly AppDbContext _context;

    public MessageRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Message>> GetConversationAsync(Guid userId1, Guid userId2)
    {
        return await _context.Messages
            .Include(m => m.Sender)
            .Include(m => m.Receiver)
            .Where(m =>
                (m.SenderId == userId1 && m.ReceiverId == userId2) ||
                (m.SenderId == userId2 && m.ReceiverId == userId1))
            .OrderBy(m => m.SentAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<(Guid OtherUserId, Message LastMessage, int UnreadCount)>> GetConversationsAsync(Guid userId)
    {
        var messages = await _context.Messages
            .Include(m => m.Sender)
            .Include(m => m.Receiver)
            .Where(m => m.SenderId == userId || m.ReceiverId == userId)
            .OrderByDescending(m => m.SentAt)
            .ToListAsync();

        var conversations = messages
            .GroupBy(m => m.SenderId == userId ? m.ReceiverId : m.SenderId)
            .Select(g =>
            {
                var otherUserId = g.Key;
                var lastMessage = g.First();
                var unreadCount = g.Count(m => m.ReceiverId == userId && !m.IsRead);
                return (otherUserId, lastMessage, unreadCount);
            })
            .OrderByDescending(c => c.lastMessage.SentAt)
            .ToList();

        return conversations;
    }

    public async Task<Message> SendAsync(Message message)
    {
        await _context.Messages.AddAsync(message);
        await _context.SaveChangesAsync();
        return message;
    }

    public async Task MarkConversationAsReadAsync(Guid currentUserId, Guid otherUserId)
    {
        var unread = await _context.Messages
            .Where(m => m.SenderId == otherUserId && m.ReceiverId == currentUserId && !m.IsRead)
            .ToListAsync();

        foreach (var msg in unread)
            msg.MarkAsRead();

        await _context.SaveChangesAsync();
    }

    public async Task<int> GetTotalUnreadCountAsync(Guid userId)
    {
        return await _context.Messages
            .CountAsync(m => m.ReceiverId == userId && !m.IsRead);
    }
}
