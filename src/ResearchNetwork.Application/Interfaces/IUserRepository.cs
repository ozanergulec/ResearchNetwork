using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByIdBasicAsync(Guid id);
    Task<User?> GetByIdWithTagsAsync(Guid id);
    Task<User?> GetByEmailAsync(string email);
    Task<IEnumerable<User>> GetAllAsync();
    Task<User> CreateAsync(User user);
    Task<User> UpdateAsync(User user);
    Task SaveChangesAsync();
    Task DeleteAsync(Guid id);
    Task DeleteAsync(User user);
    Task<bool> ExistsAsync(string email);
    Task<bool> ExistsAsync(string email, Guid excludeUserId);
    Task AddUserTagAsync(Guid userId, Guid tagId);
    Task RemoveUserTagAsync(Guid userId, Guid tagId);

    // Follow
    Task<UserFollow?> GetFollowAsync(Guid followerId, Guid followeeId);
    Task AddFollowAsync(UserFollow follow);
    Task RemoveFollowAsync(Guid followerId, Guid followeeId);
    Task<IEnumerable<Guid>> GetFollowingIdsAsync(Guid userId);
    Task<IEnumerable<UserFollow>> GetFollowersAsync(Guid userId);
    Task<IEnumerable<UserFollow>> GetFollowingAsync(Guid userId);

    // Search
    Task<(IEnumerable<User> Items, int TotalCount)> SearchAsync(string query, int page, int pageSize);
    Task<(IEnumerable<User> Items, int TotalCount)> SearchByTagAsync(string tagName, int page, int pageSize);
}
