using Microsoft.EntityFrameworkCore;
using ResearchNetwork.Application.DTOs;
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

    public async Task<(IEnumerable<ReviewablePublicationProjection> Items, int TotalCount)>
        GetPublicationsLookingForReviewersAsync(Guid? currentUserId, int page = 1, int pageSize = 10)
    {
        // null user'ı SQL tarafında eşleşmeyecek bir değere (Guid.Empty) map'le.
        var userIdForCompare = currentUserId ?? Guid.Empty;

        var baseQuery = _context.Publications
            .AsNoTracking()
            .Where(p => p.IsLookingForReviewers);

        var totalCount = await baseQuery.CountAsync();

        var items = await baseQuery
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ReviewablePublicationProjection(
                p.Id,
                p.Title,
                p.Abstract,
                p.PublishedDate,
                new UserSummaryDto(
                    p.Author.Id,
                    p.Author.FullName,
                    p.Author.Title,
                    p.Author.Institution,
                    p.Author.ProfileImageUrl,
                    p.Author.CoverImageUrl,
                    p.Author.IsVerified
                ),
                p.Tags.Select(pt => pt.Tag.Name).ToList(),
                p.ReviewRequests.Count,
                p.ReviewRequests.Any(r => r.ReviewerId == userIdForCompare),
                p.AuthorId == userIdForCompare
            ))
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<ReviewablePublicationProjection?> GetReviewablePublicationByIdAsync(Guid publicationId, Guid? currentUserId)
    {
        var userIdForCompare = currentUserId ?? Guid.Empty;

        return await _context.Publications
            .AsNoTracking()
            .Where(p => p.Id == publicationId)
            .Select(p => new ReviewablePublicationProjection(
                p.Id,
                p.Title,
                p.Abstract,
                p.PublishedDate,
                new UserSummaryDto(
                    p.Author.Id,
                    p.Author.FullName,
                    p.Author.Title,
                    p.Author.Institution,
                    p.Author.ProfileImageUrl,
                    p.Author.CoverImageUrl,
                    p.Author.IsVerified
                ),
                p.Tags.Select(pt => pt.Tag.Name).ToList(),
                p.ReviewRequests.Count,
                p.ReviewRequests.Any(r => r.ReviewerId == userIdForCompare),
                p.AuthorId == userIdForCompare
            ))
            .FirstOrDefaultAsync();
    }

    public async Task<int> GetCompletedReviewCountAsync(Guid reviewerId)
    {
        return await _context.ReviewRequests
            .CountAsync(r => r.ReviewerId == reviewerId && r.Status == ReviewRequestStatus.Completed);
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

    public async Task UpdateRatingAsync(ReviewRating rating)
    {
        _context.ReviewRatings.Update(rating);
        await _context.SaveChangesAsync();
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

    public async Task<(HashSet<Guid> AppliedIds, int CompletedReviewCount)>
        GetReviewContextForPublicationAsync(Guid publicationId, Guid candidateId)
    {
        var appliedIds = (await _context.ReviewRequests
            .Where(r => r.PublicationId == publicationId)
            .Select(r => r.ReviewerId)
            .ToListAsync()).ToHashSet();

        var completedCount = await _context.ReviewRequests
            .Where(r => r.ReviewerId == candidateId && r.Status == ReviewRequestStatus.Completed)
            .CountAsync();

        return (appliedIds, completedCount);
    }
}
