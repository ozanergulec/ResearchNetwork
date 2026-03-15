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

    public async Task<(IEnumerable<Publication> Items, int TotalCount)> GetByAuthorIdAsync(Guid authorId, int page, int pageSize)
    {
        var query = _context.Publications
            .Where(p => p.AuthorId == authorId)
            .Include(p => p.Author)
            .Include(p => p.Tags)
                .ThenInclude(pt => pt.Tag)
            .Include(p => p.ReviewRequests)
            .OrderByDescending(p => p.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<(IEnumerable<Publication> Items, int TotalCount)> GetLatestPublicationsByAuthorAsync(Guid authorId, int count)
    {
        var query = _context.Publications
            .Where(p => p.AuthorId == authorId)
            .Include(p => p.Author)
            .Include(p => p.Tags)
                .ThenInclude(pt => pt.Tag)
            .OrderByDescending(p => p.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Take(count)
            .ToListAsync();
            
        return (items, totalCount);
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

    public async Task<double> CalculateAuthorAverageRatingAsync(Guid authorId)
    {
        var ratedPublications = await _context.Publications
            .Where(p => p.AuthorId == authorId && p.AverageRating > 0)
            .ToListAsync();

        if (ratedPublications.Count == 0) return 0;
        return ratedPublications.Average(p => p.AverageRating);
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

    public async Task<(IEnumerable<Publication> Items, int TotalCount)> GetSavedByUserAsync(Guid userId, int page, int pageSize)
    {
        var query = _context.SavedPublications
            .Where(s => s.UserId == userId)
            .Include(s => s.Publication)
                .ThenInclude(p => p.Author)
            .Include(s => s.Publication)
                .ThenInclude(p => p.Tags)
                    .ThenInclude(pt => pt.Tag)
            .OrderByDescending(s => s.SavedAt)
            .Select(s => s.Publication);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
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

    public async Task UpdateShareAsync(PublicationShare share)
    {
        _context.PublicationShares.Update(share);
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

    public async Task<(IEnumerable<PublicationShare> Items, int TotalCount)> GetSharedByUserAsync(Guid userId, int page, int pageSize)
    {
        var query = _context.PublicationShares
            .Where(s => s.UserId == userId)
            .Include(s => s.User)
            .Include(s => s.Publication)
                .ThenInclude(p => p.Author)
            .Include(s => s.Publication)
                .ThenInclude(p => p.Tags)
                    .ThenInclude(pt => pt.Tag)
            .OrderByDescending(s => s.SharedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<(IEnumerable<PublicationShare> Items, int TotalCount)> GetAllSharesForFeedAsync(int page, int pageSize)
    {
        var query = _context.PublicationShares
            .Include(s => s.User)
            .Include(s => s.Publication)
                .ThenInclude(p => p.Author)
            .Include(s => s.Publication)
                .ThenInclude(p => p.Tags)
                    .ThenInclude(pt => pt.Tag)
            .OrderByDescending(s => s.SharedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    // --- Embedding ---

    public async Task<PublicationEmbedding?> GetEmbeddingAsync(Guid publicationId)
    {
        return await _context.PublicationEmbeddings
            .FirstOrDefaultAsync(e => e.PublicationId == publicationId);
    }

    public async Task UpsertEmbeddingAsync(PublicationEmbedding embedding)
    {
        var existing = await _context.PublicationEmbeddings
            .FirstOrDefaultAsync(e => e.PublicationId == embedding.PublicationId);

        if (existing != null)
        {
            existing.UpdateEmbedding(embedding.Embedding);
        }
        else
        {
            _context.PublicationEmbeddings.Add(embedding);
        }

        await _context.SaveChangesAsync();
    }

    public async Task<List<(Guid PublicationId, double Similarity)>> FindSimilarByEmbeddingAsync(
        float[] queryEmbedding, int topK = 10, Guid? excludePublicationId = null)
    {
        var allEmbeddings = await _context.PublicationEmbeddings.ToListAsync();

        var scored = new List<(Guid PublicationId, double Similarity)>();

        foreach (var item in allEmbeddings)
        {
            if (excludePublicationId.HasValue && item.PublicationId == excludePublicationId.Value)
                continue;

            var similarity = CosineSimilarity(queryEmbedding, item.Embedding);
            scored.Add((item.PublicationId, similarity));
        }

        return scored
            .OrderByDescending(x => x.Similarity)
            .Take(topK)
            .ToList();
    }

    private static double CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length != b.Length) return 0;

        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        var denominator = Math.Sqrt(normA) * Math.Sqrt(normB);
        return denominator == 0 ? 0 : dot / denominator;
    }

    // --- Search ---

    public async Task<(IEnumerable<Publication> Items, int TotalCount)> SearchAsync(string query, int page, int pageSize)
    {
        var lowerQuery = query.ToLower();
        var baseQuery = _context.Publications
            .Where(p => p.Title.ToLower().Contains(lowerQuery)
                     || (p.Abstract != null && p.Abstract.ToLower().Contains(lowerQuery))
                     || p.Author.FullName.ToLower().Contains(lowerQuery)
                     || p.Tags.Any(pt => pt.Tag.Name.ToLower().Contains(lowerQuery)));

        var totalCount = await baseQuery.CountAsync();

        var items = await baseQuery
            .Include(p => p.Author)
            .Include(p => p.Tags)
                .ThenInclude(pt => pt.Tag)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<(IEnumerable<Publication> Items, int TotalCount)> SearchByTagAsync(string tagName, int page, int pageSize)
    {
        var lowerTag = tagName.ToLower();
        var baseQuery = _context.Publications
            .Where(p => p.Tags.Any(pt => pt.Tag.Name.ToLower().Contains(lowerTag)));

        var totalCount = await baseQuery.CountAsync();

        var items = await baseQuery
            .Include(p => p.Author)
            .Include(p => p.Tags)
                .ThenInclude(pt => pt.Tag)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }
}

