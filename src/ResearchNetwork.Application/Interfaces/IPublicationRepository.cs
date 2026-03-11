using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.Application.Interfaces;

public interface IPublicationRepository
{
    Task<Publication?> GetByIdAsync(Guid id);
    Task<IEnumerable<Publication>> GetAllAsync();
    Task<(IEnumerable<Publication> Items, int TotalCount)> GetFeedAsync(int page, int pageSize);
    Task<(IEnumerable<Publication> Items, int TotalCount)> GetByAuthorIdAsync(Guid authorId, int page, int pageSize);
    Task<(IEnumerable<Publication> Items, int TotalCount)> GetLatestPublicationsByAuthorAsync(Guid authorId, int count);
    Task<Publication> CreateAsync(Publication publication);
    Task<Publication> UpdateAsync(Publication publication);
    Task DeleteAsync(Guid id);
    
    // Rating
    Task<PublicationRating?> GetRatingAsync(Guid publicationId, Guid userId);
    Task AddRatingAsync(PublicationRating rating);
    Task UpdateRatingScoreAsync(Guid ratingId, int newScore);
    Task RemoveRatingAsync(Guid ratingId);
    Task<double> CalculateAverageRatingAsync(Guid publicationId);
    Task<double> CalculateAuthorAverageRatingAsync(Guid authorId);

    // Save
    Task<SavedPublication?> GetSavedAsync(Guid publicationId, Guid userId);
    Task AddSavedAsync(SavedPublication saved);
    Task RemoveSavedAsync(Guid publicationId, Guid userId);
    Task<(IEnumerable<Publication> Items, int TotalCount)> GetSavedByUserAsync(Guid userId, int page, int pageSize);

    // Share
    Task<PublicationShare?> GetShareAsync(Guid publicationId, Guid userId);
    Task AddShareAsync(PublicationShare share);
    Task UpdateShareAsync(PublicationShare share);
    Task RemoveShareAsync(Guid publicationId, Guid userId);
    Task<(IEnumerable<PublicationShare> Items, int TotalCount)> GetSharedByUserAsync(Guid userId, int page, int pageSize);
    Task<(IEnumerable<PublicationShare> Items, int TotalCount)> GetAllSharesForFeedAsync(int page, int pageSize);

    // Search
    Task<(IEnumerable<Publication> Items, int TotalCount)> SearchAsync(string query, int page, int pageSize);
    Task<(IEnumerable<Publication> Items, int TotalCount)> SearchByTagAsync(string tagName, int page, int pageSize);
}
