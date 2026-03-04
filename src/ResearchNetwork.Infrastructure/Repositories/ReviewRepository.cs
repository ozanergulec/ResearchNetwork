using Microsoft.EntityFrameworkCore;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;
using ResearchNetwork.Infrastructure.Data;

namespace ResearchNetwork.Infrastructure.Repositories;

public class ReviewRepository : IReviewRepository
{
    private readonly AppDbContext _context;

    public ReviewRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ReviewRequest?> GetByIdAsync(Guid id)
    {
        return await _context.ReviewRequests
            .Include(r => r.Publication)
                .ThenInclude(p => p.Author)
            .Include(r => r.Reviewer)
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<ReviewRequest?> GetByPublicationAndReviewerAsync(Guid publicationId, Guid reviewerId)
    {
        return await _context.ReviewRequests
            .Include(r => r.Publication)
                .ThenInclude(p => p.Author)
            .Include(r => r.Reviewer)
            .FirstOrDefaultAsync(r => r.PublicationId == publicationId && r.ReviewerId == reviewerId);
    }

    public async Task<IEnumerable<ReviewRequest>> GetByPublicationIdAsync(Guid publicationId)
    {
        return await _context.ReviewRequests
            .Include(r => r.Publication)
                .ThenInclude(p => p.Author)
            .Include(r => r.Reviewer)
            .Where(r => r.PublicationId == publicationId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<ReviewRequest>> GetByReviewerIdAsync(Guid reviewerId)
    {
        return await _context.ReviewRequests
            .Include(r => r.Publication)
                .ThenInclude(p => p.Author)
            .Include(r => r.Reviewer)
            .Where(r => r.ReviewerId == reviewerId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<(IEnumerable<Publication> Items, int TotalCount)> GetPublicationsLookingForReviewersAsync(int page = 1, int pageSize = 10)
    {
        var query = _context.Publications
            .Include(p => p.Author)
            .Include(p => p.Tags)
                .ThenInclude(pt => pt.Tag)
            .Include(p => p.ReviewRequests)
            .Where(p => p.IsLookingForReviewers)
            .OrderByDescending(p => p.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<ReviewRequest> CreateAsync(ReviewRequest reviewRequest)
    {
        _context.ReviewRequests.Add(reviewRequest);
        await _context.SaveChangesAsync();
        return reviewRequest;
    }

    public async Task UpdateAsync(ReviewRequest reviewRequest)
    {
        _context.ReviewRequests.Update(reviewRequest);
        await _context.SaveChangesAsync();
    }
}
