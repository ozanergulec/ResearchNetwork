using Microsoft.EntityFrameworkCore;
using ResearchNetwork.Application.DTOs;
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

    public async Task<(IEnumerable<Message> Messages, int TotalCount)> GetConversationAsync(Guid userId1, Guid userId2, int page, int pageSize)
    {
        var baseQuery = _context.Messages
            .AsNoTracking()
            .Where(m =>
                (m.SenderId == userId1 && m.ReceiverId == userId2) ||
                (m.SenderId == userId2 && m.ReceiverId == userId1));

        var totalCount = await baseQuery.CountAsync();

        var messages = await baseQuery
            .Include(m => m.Sender)
            .Include(m => m.Receiver)
            .Include(m => m.AttachedPublication)
                .ThenInclude(p => p!.Author)
            .OrderByDescending(m => m.SentAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        messages.Reverse();

        return (messages, totalCount);
    }

    public async Task<IEnumerable<ConversationSummary>> GetConversationsAsync(Guid userId)
    {
        var stats = await _context.Messages
            .AsNoTracking()
            .Where(m => m.SenderId == userId || m.ReceiverId == userId)
            .GroupBy(m => m.SenderId == userId ? m.ReceiverId : m.SenderId)
            .Select(g => new
            {
                OtherUserId = g.Key,
                UnreadCount = g.Count(x => x.ReceiverId == userId && !x.IsRead),
                LastMessageAt = g.Max(x => x.SentAt)
            })
            .ToListAsync();

        if (stats.Count == 0)
            return [];

        var otherUserIds = stats.Select(s => s.OtherUserId).ToHashSet();
        var latestTimestamps = stats.Select(s => s.LastMessageAt).Distinct().ToList();

        var users = await _context.Users
            .AsNoTracking()
            .Where(u => otherUserIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.ProfileImageUrl,
                u.IsVerified,
                u.Title,
                u.Institution
            })
            .ToDictionaryAsync(u => u.Id);

        var latestMessageCandidates = await _context.Messages
            .AsNoTracking()
            .Where(m =>
                (m.SenderId == userId || m.ReceiverId == userId) &&
                latestTimestamps.Contains(m.SentAt))
            .Select(m => new
            {
                m.Id,
                OtherUserId = m.SenderId == userId ? m.ReceiverId : m.SenderId,
                m.Content,
                m.AttachedPublicationId,
                m.SentAt
            })
            .ToListAsync();

        var latestMessagesByConversation = latestMessageCandidates
            .GroupBy(m => m.OtherUserId)
            .ToDictionary(
                g => g.Key,
                g => g
                    .OrderByDescending(x => x.SentAt)
                    .ThenByDescending(x => x.Id)
                    .First()
            );

        var result = stats
            .Where(s => users.ContainsKey(s.OtherUserId) && latestMessagesByConversation.ContainsKey(s.OtherUserId))
            .Select(s =>
            {
                var user = users[s.OtherUserId];
                var last = latestMessagesByConversation[s.OtherUserId];
                return new ConversationSummary(
                    s.OtherUserId,
                    user.FullName,
                    user.ProfileImageUrl,
                    user.IsVerified,
                    user.Title,
                    user.Institution,
                    last.Content ?? string.Empty,
                    last.AttachedPublicationId != null,
                    s.LastMessageAt,
                    s.UnreadCount
                );
            })
            .OrderByDescending(c => c.LastMessageAt)
            .ToList();

        return result;
    }

    public async Task<Message> SendAsync(Message message)
    {
        await _context.Messages.AddAsync(message);
        await _context.SaveChangesAsync();
        return message;
    }

    public async Task MarkConversationAsReadAsync(Guid currentUserId, Guid otherUserId)
    {
        await _context.Messages
            .Where(m => m.SenderId == otherUserId && m.ReceiverId == currentUserId && !m.IsRead)
            .ExecuteUpdateAsync(setters =>
                setters.SetProperty(m => m.IsRead, true));
    }

    public async Task<int> GetTotalUnreadCountAsync(Guid userId)
    {
        return await _context.Messages
            .CountAsync(m => m.ReceiverId == userId && !m.IsRead);
    }
}
