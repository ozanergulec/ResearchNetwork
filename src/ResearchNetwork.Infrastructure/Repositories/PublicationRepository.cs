using Microsoft.EntityFrameworkCore;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;
using ResearchNetwork.Infrastructure.Data;

namespace ResearchNetwork.Infrastructure.Repositories;

public class PublicationRepository : IPublicationRepository
{
    private readonly AppDbContext _context;

    public PublicationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Publication?> GetByIdAsync(Guid id)
    {
        return await _context.Publications
            .Include(p => p.Author)
            .Include(p => p.Tags)
                .ThenInclude(pt => pt.Tag)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<IEnumerable<Publication>> GetAllAsync()
    {
        return await _context.Publications
            .Include(p => p.Author)
            .ToListAsync();
    }

    public async Task<(IEnumerable<Publication> Items, int TotalCount)> GetFeedAsync(int page, int pageSize)
    {
        var query = _context.Publications
            .Include(p => p.Author)
            .Include(p => p.Tags)
                .ThenInclude(pt => pt.Tag)
            .OrderByDescending(p => p.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<IEnumerable<Publication>> GetByAuthorIdAsync(Guid authorId)
    {
        return await _context.Publications
            .Where(p => p.AuthorId == authorId)
            .Include(p => p.Author)
            .Include(p => p.Tags)
                .ThenInclude(pt => pt.Tag)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Publication>> GetLatestPublicationsByAuthorAsync(Guid authorId, int count)
    {
        return await _context.Publications
            .Where(p => p.AuthorId == authorId)
            .Include(p => p.Author)
            .Include(p => p.Tags)
                .ThenInclude(pt => pt.Tag)
            .OrderByDescending(p => p.CreatedAt)
            .Take(count)
            .ToListAsync();
    }

    public async Task<Publication> CreateAsync(Publication publication)
    {
        _context.Publications.Add(publication);
        await _context.SaveChangesAsync();
        return publication;
    }

    public async Task<Publication> UpdateAsync(Publication publication)
    {
        _context.Publications.Update(publication);
        await _context.SaveChangesAsync();
        return publication;
    }

    public async Task DeleteAsync(Guid id)
    {
        var publication = await _context.Publications.FindAsync(id);
        if (publication != null)
        {
            _context.Publications.Remove(publication);
            await _context.SaveChangesAsync();
        }
    }

    // --- Rating ---

    public async Task<PublicationRating?> GetRatingAsync(Guid publicationId, Guid userId)
    {
        return await _context.PublicationRatings
            .FirstOrDefaultAsync(r => r.PublicationId == publicationId && r.UserId == userId);
    }

    public async Task AddRatingAsync(PublicationRating rating)
    {
        _context.PublicationRatings.Add(rating);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateRatingScoreAsync(Guid ratingId, int newScore)
    {
        var rating = await _context.PublicationRatings.FindAsync(ratingId);
        if (rating != null)
        {
            // Use reflection to update private setter
            var scoreProp = typeof(PublicationRating).GetProperty("Score");
            scoreProp?.SetValue(rating, newScore);
            await _context.SaveChangesAsync();
        }
    }

    public async Task RemoveRatingAsync(Guid ratingId)
    {
        var rating = await _context.PublicationRatings.FindAsync(ratingId);
        if (rating != null)
        {
            _context.PublicationRatings.Remove(rating);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<double> CalculateAverageRatingAsync(Guid publicationId)
    {
        var ratings = await _context.PublicationRatings
            .Where(r => r.PublicationId == publicationId)
            .ToListAsync();

        if (ratings.Count == 0) return 0;
        return ratings.Average(r => r.Score);
    }

    // --- Save ---

    public async Task<SavedPublication?> GetSavedAsync(Guid publicationId, Guid userId)
    {
        return await _context.SavedPublications
            .FirstOrDefaultAsync(s => s.PublicationId == publicationId && s.UserId == userId);
    }

    public async Task AddSavedAsync(SavedPublication saved)
    {
        _context.SavedPublications.Add(saved);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveSavedAsync(Guid publicationId, Guid userId)
    {
        var saved = await _context.SavedPublications
            .FirstOrDefaultAsync(s => s.PublicationId == publicationId && s.UserId == userId);
        if (saved != null)
        {
            _context.SavedPublications.Remove(saved);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<IEnumerable<Publication>> GetSavedByUserAsync(Guid userId)
    {
        return await _context.SavedPublications
            .Where(s => s.UserId == userId)
            .Include(s => s.Publication)
                .ThenInclude(p => p.Author)
            .Include(s => s.Publication)
                .ThenInclude(p => p.Tags)
                    .ThenInclude(pt => pt.Tag)
            .OrderByDescending(s => s.SavedAt)
            .Select(s => s.Publication)
            .ToListAsync();
    }

    // --- Share ---

    public async Task<PublicationShare?> GetShareAsync(Guid publicationId, Guid userId)
    {
        return await _context.PublicationShares
            .FirstOrDefaultAsync(s => s.PublicationId == publicationId && s.UserId == userId);
    }

    public async Task AddShareAsync(PublicationShare share)
    {
        _context.PublicationShares.Add(share);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveShareAsync(Guid publicationId, Guid userId)
    {
        var share = await _context.PublicationShares
            .FirstOrDefaultAsync(s => s.PublicationId == publicationId && s.UserId == userId);
        if (share != null)
        {
            _context.PublicationShares.Remove(share);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<IEnumerable<Publication>> GetSharedByUserAsync(Guid userId)
    {
        return await _context.PublicationShares
            .Where(s => s.UserId == userId)
            .Include(s => s.Publication)
                .ThenInclude(p => p.Author)
            .Include(s => s.Publication)
                .ThenInclude(p => p.Tags)
                    .ThenInclude(pt => pt.Tag)
            .OrderByDescending(s => s.SharedAt)
            .Select(s => s.Publication)
            .ToListAsync();
    }
}
