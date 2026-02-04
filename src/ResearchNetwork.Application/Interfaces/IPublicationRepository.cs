using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.Application.Interfaces;

public interface IPublicationRepository
{
    Task<Publication?> GetByIdAsync(Guid id);
    Task<IEnumerable<Publication>> GetAllAsync();
    Task<IEnumerable<Publication>> GetByAuthorIdAsync(Guid authorId);
    Task<IEnumerable<Publication>> GetLatestPublicationsByAuthorAsync(Guid authorId, int count);
    Task<Publication> CreateAsync(Publication publication);
    Task<Publication> UpdateAsync(Publication publication);
    Task DeleteAsync(Guid id);
}
