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
        // Id and CreatedAt are set in Constructor
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
}
