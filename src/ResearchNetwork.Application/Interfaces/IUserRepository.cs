using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByIdWithTagsAsync(Guid id);
    Task<User?> GetByEmailAsync(string email);
    Task<IEnumerable<User>> GetAllAsync();
    Task<User> CreateAsync(User user);
    Task<User> UpdateAsync(User user);
    Task DeleteAsync(Guid id);
    Task<bool> ExistsAsync(string email);
    Task AddUserTagAsync(Guid userId, Guid tagId);
    Task RemoveUserTagAsync(Guid userId, Guid tagId);

    // Follow
    Task<UserFollow?> GetFollowAsync(Guid followerId, Guid followeeId);
    Task AddFollowAsync(UserFollow follow);
    Task RemoveFollowAsync(Guid followerId, Guid followeeId);
    Task<IEnumerable<Guid>> GetFollowingIdsAsync(Guid userId);
}
