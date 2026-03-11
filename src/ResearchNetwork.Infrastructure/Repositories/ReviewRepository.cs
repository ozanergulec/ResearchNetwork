using Microsoft.EntityFrameworkCore;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;
using ResearchNetwork.Domain.Enums;
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
            .Include(r => r.Rating)
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<ReviewRequest?> GetByPublicationAndReviewerAsync(Guid publicationId, Guid reviewerId)
    {
        return await _context.ReviewRequests
            .Include(r => r.Publication)
                .ThenInclude(p => p.Author)
            .Include(r => r.Reviewer)
            .Include(r => r.Rating)
            .FirstOrDefaultAsync(r => r.PublicationId == publicationId && r.ReviewerId == reviewerId);
    }

    public async Task<IEnumerable<ReviewRequest>> GetByPublicationIdAsync(Guid publicationId)
    {
        return await _context.ReviewRequests
            .Include(r => r.Publication)
                .ThenInclude(p => p.Author)
            .Include(r => r.Reviewer)
            .Include(r => r.Rating)
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
            .Include(r => r.Rating)
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

    // ==================== Review Rating ====================

    public async Task<ReviewRating?> GetRatingByReviewRequestIdAsync(Guid reviewRequestId)
    {
        return await _context.ReviewRatings
            .FirstOrDefaultAsync(r => r.ReviewRequestId == reviewRequestId);
    }

    public async Task<ReviewRating> CreateRatingAsync(ReviewRating rating)
    {
        _context.ReviewRatings.Add(rating);
        await _context.SaveChangesAsync();
        return rating;
    }

    public async Task<double> CalculateReviewerAverageScoreAsync(Guid reviewerId)
    {
        var ratings = await _context.ReviewRatings
            .Include(r => r.ReviewRequest)
            .Where(r => r.ReviewRequest.ReviewerId == reviewerId)
            .ToListAsync();

        if (ratings.Count == 0)
            return 0;

        return ratings.Average(r => r.Score);
    }
}
