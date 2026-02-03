using Microsoft.EntityFrameworkCore;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;
using ResearchNetwork.Infrastructure.Data;

namespace ResearchNetwork.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByIdAsync(Guid id)
    {
        return await _context.Users
            .Include(u => u.Publications)
            .Include(u => u.Tags)
                .ThenInclude(ut => ut.Tag)
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    public async Task<User?> GetByIdWithTagsAsync(Guid id)
    {
        return await _context.Users
            .Include(u => u.Tags)
                .ThenInclude(ut => ut.Tag)
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _context.Users
            .FirstOrDefaultAsync(u => u.Email == email);
    }

    public async Task<IEnumerable<User>> GetAllAsync()
    {
        return await _context.Users.ToListAsync();
    }

    public async Task<User> CreateAsync(User user)
    {
        // Id and CreatedAt are set in User constructor
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    public async Task<User> UpdateAsync(User user)
    {
        // Update logic should be handled by domain methods or tracking
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
        return user;
    }

    public async Task DeleteAsync(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user != null)
        {
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<bool> ExistsAsync(string email)
    {
        return await _context.Users.AnyAsync(u => u.Email == email);
    }

    public async Task AddUserTagAsync(Guid userId, Guid tagId)
    {
        // Check if the relationship already exists
        var existingUserTag = await _context.Set<UserTag>()
            .FirstOrDefaultAsync(ut => ut.UserId == userId && ut.TagId == tagId);

        if (existingUserTag != null)
        {
            return; // Already exists
        }

        // Create new UserTag relationship
        var userTag = new UserTag
        {
            UserId = userId,
            TagId = tagId
        };

        _context.Set<UserTag>().Add(userTag);

        // Increment tag usage count
        var tag = await _context.Tags.FindAsync(tagId);
        if (tag != null)
        {
            tag.UsageCount++;
        }

        await _context.SaveChangesAsync();
    }

    public async Task RemoveUserTagAsync(Guid userId, Guid tagId)
    {
        var userTag = await _context.Set<UserTag>()
            .FirstOrDefaultAsync(ut => ut.UserId == userId && ut.TagId == tagId);

        if (userTag == null)
        {
            return; // Doesn't exist
        }

        _context.Set<UserTag>().Remove(userTag);

        // Decrement tag usage count
        var tag = await _context.Tags.FindAsync(tagId);
        if (tag != null && tag.UsageCount > 0)
        {
            tag.UsageCount--;
        }

        await _context.SaveChangesAsync();
    }
}
