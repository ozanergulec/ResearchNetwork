using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.Application.Interfaces;

public interface IPublicationRepository
{
    Task<Publication?> GetByIdAsync(Guid id);
    Task<IEnumerable<Publication>> GetAllAsync();
    Task<(IEnumerable<Publication> Items, int TotalCount)> GetFeedAsync(int page, int pageSize);
    Task<IEnumerable<Publication>> GetByAuthorIdAsync(Guid authorId);
    Task<IEnumerable<Publication>> GetLatestPublicationsByAuthorAsync(Guid authorId, int count);
    Task<Publication> CreateAsync(Publication publication);
    Task<Publication> UpdateAsync(Publication publication);
    Task DeleteAsync(Guid id);
    
    // Rating
    Task<PublicationRating?> GetRatingAsync(Guid publicationId, Guid userId);
    Task AddRatingAsync(PublicationRating rating);
    Task UpdateRatingScoreAsync(Guid ratingId, int newScore);
    Task RemoveRatingAsync(Guid ratingId);
    Task<double> CalculateAverageRatingAsync(Guid publicationId);

    // Save
    Task<SavedPublication?> GetSavedAsync(Guid publicationId, Guid userId);
    Task AddSavedAsync(SavedPublication saved);
    Task RemoveSavedAsync(Guid publicationId, Guid userId);
    Task<IEnumerable<Publication>> GetSavedByUserAsync(Guid userId);

    // Share
    Task<PublicationShare?> GetShareAsync(Guid publicationId, Guid userId);
    Task AddShareAsync(PublicationShare share);
    Task RemoveShareAsync(Guid publicationId, Guid userId);
    Task<IEnumerable<Publication>> GetSharedByUserAsync(Guid userId);
}
