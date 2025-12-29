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
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<IEnumerable<Publication>> GetAllAsync()
    {
        return await _context.Publications
            .Include(p => p.Author)
            .ToListAsync();
    }

    public async Task<IEnumerable<Publication>> GetByAuthorIdAsync(Guid authorId)
    {
        return await _context.Publications
            .Where(p => p.AuthorId == authorId)
            .ToListAsync();
    }

    public async Task<Publication> CreateAsync(Publication publication)
    {
        publication.Id = Guid.NewGuid();
        publication.CreatedAt = DateTime.UtcNow;
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
