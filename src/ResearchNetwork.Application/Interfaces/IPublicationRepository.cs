using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.Application.Interfaces;

public interface IPublicationRepository
{
    Task<Publication?> GetByIdAsync(Guid id);
    Task<IEnumerable<Publication>> GetAllAsync();
    Task<(IEnumerable<Publication> Items, int TotalCount)> GetFeedAsync(int page, int pageSize);
    Task<(IEnumerable<Publication> Items, int TotalCount)> GetByAuthorIdAsync(Guid authorId, int page, int pageSize);
    Task<(IEnumerable<Publication> Items, int TotalCount)> GetLatestPublicationsByAuthorAsync(Guid authorId, int count);

    // Projection-based: yazarın yayınlarını review paneli için hafif biçimde getirir.
    Task<IEnumerable<MyPublicationForReviewProjection>> GetMyPublicationsForReviewAsync(Guid authorId);
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
    Task<(IEnumerable<Publication> Items, int TotalCount)> SearchAsync(string query, int page, int pageSize, string? tagFilter = null, int? minRating = null, string? sortBy = null);
    Task<(IEnumerable<Publication> Items, int TotalCount)> SearchByTagAsync(string tagName, int page, int pageSize, string? tagFilter = null, int? minRating = null, string? sortBy = null);

    // Embedding
    Task<PublicationEmbedding?> GetEmbeddingAsync(Guid publicationId);
    Task UpsertEmbeddingAsync(PublicationEmbedding embedding);
    Task<List<(Guid PublicationId, double Similarity)>> FindSimilarByEmbeddingAsync(float[] queryEmbedding, int topK = 10, Guid? excludePublicationId = null);
    Task<List<PublicationEmbedding>> GetEmbeddingsByAuthorAsync(Guid authorId);
    Task<Dictionary<Guid, List<float[]>>> GetAllEmbeddingsGroupedByAuthorAsync();
    Task<Dictionary<Guid, HashSet<string>>> GetPublicationTagsByAuthorAsync();

    // Citation Analysis
    Task<CitationAnalysis?> GetCitationAnalysisAsync(Guid publicationId);
    Task UpsertCitationAnalysisAsync(CitationAnalysis analysis);

    // Reference matching
    Task<Publication?> GetByDoiAsync(string doi);
    Task<List<Publication>> SearchByTitleAsync(string title);
    Task<bool> CitationExistsAsync(Guid publicationId, Guid userId);
    Task AddCitationAsync(PublicationCitation citation);
}
