using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.Application.Interfaces;

public interface IPublicationService
{
    Task<Publication> CreatePublicationAsync(Guid authorId, CreatePublicationDto dto);
    Task<Publication> UpdatePublicationAsync(Guid publicationId, Guid authorId, UpdatePublicationDto dto);
    Task<List<Tag>> FindOrCreateTagsAsync(List<string> tagNames);
    Task DeleteFileAsync(string fileUrl);
}
