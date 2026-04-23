using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.Application.Interfaces;

public interface IReviewRepository
{
    Task<ReviewRequest?> GetByIdAsync(Guid id);
    Task<ReviewRequest?> GetByPublicationAndReviewerAsync(Guid publicationId, Guid reviewerId);
    Task<IEnumerable<ReviewRequest>> GetByPublicationIdAsync(Guid publicationId);
    Task<IEnumerable<ReviewRequest>> GetByReviewerIdAsync(Guid reviewerId);

    // Projection-based queries (avoid heavy Includes).
    Task<(IEnumerable<ReviewablePublicationProjection> Items, int TotalCount)>
        GetPublicationsLookingForReviewersAsync(Guid? currentUserId, int page = 1, int pageSize = 10);
    Task<ReviewablePublicationProjection?> GetReviewablePublicationByIdAsync(Guid publicationId, Guid? currentUserId);
    Task<int> GetCompletedReviewCountAsync(Guid reviewerId);

    Task<ReviewRequest> CreateAsync(ReviewRequest reviewRequest);
    Task UpdateAsync(ReviewRequest reviewRequest);

    // Review Rating
    Task<ReviewRating?> GetRatingByReviewRequestIdAsync(Guid reviewRequestId);
    Task<ReviewRating> CreateRatingAsync(ReviewRating rating);
    Task UpdateRatingAsync(ReviewRating rating);
    Task<double> CalculateReviewerAverageScoreAsync(Guid reviewerId);

    // Reviewer matching context
    Task<(HashSet<Guid> AppliedIds, int CompletedReviewCount)>
        GetReviewContextForPublicationAsync(Guid publicationId, Guid candidateId);
}
