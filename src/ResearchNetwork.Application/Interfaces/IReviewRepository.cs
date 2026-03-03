using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.Application.Interfaces;

public interface IReviewRepository
{
    Task<ReviewRequest?> GetByIdAsync(Guid id);
    Task<ReviewRequest?> GetByPublicationAndReviewerAsync(Guid publicationId, Guid reviewerId);
    Task<IEnumerable<ReviewRequest>> GetByPublicationIdAsync(Guid publicationId);
    Task<IEnumerable<ReviewRequest>> GetByReviewerIdAsync(Guid reviewerId);
    Task<IEnumerable<Publication>> GetPublicationsLookingForReviewersAsync();
    Task<ReviewRequest> CreateAsync(ReviewRequest reviewRequest);
    Task UpdateAsync(ReviewRequest reviewRequest);
}
