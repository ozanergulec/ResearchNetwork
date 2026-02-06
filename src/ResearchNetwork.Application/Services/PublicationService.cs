using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.Application.Services;

public class PublicationService : IPublicationService
{
    private readonly IPublicationRepository _publicationRepository;
    private readonly ITagRepository _tagRepository;
    private readonly IUserRepository _userRepository;

    public PublicationService(
        IPublicationRepository publicationRepository,
        ITagRepository tagRepository,
        IUserRepository userRepository)
    {
        _publicationRepository = publicationRepository;
        _tagRepository = tagRepository;
        _userRepository = userRepository;
    }

    public async Task<Publication> CreatePublicationAsync(Guid authorId, CreatePublicationDto dto)
    {
        // Verify author exists
        var author = await _userRepository.GetByIdAsync(authorId);
        if (author == null)
        {
            throw new InvalidOperationException($"Author with ID {authorId} not found.");
        }

        // Create the publication entity
        var publication = new Publication(authorId, dto.Title, dto.PublishedDate?.Year ?? DateTime.UtcNow.Year)
        {
            Abstract = dto.Abstract,
            DOI = dto.DOI,
            FileUrl = dto.FileUrl,
            PublishedDate = dto.PublishedDate
        };

        // Handle tags if provided
        if (dto.Tags != null && dto.Tags.Count > 0)
        {
            var tags = await FindOrCreateTagsAsync(dto.Tags);
            
            // Create PublicationTag associations
            foreach (var tag in tags)
            {
                publication.Tags.Add(new PublicationTag
                {
                    Publication = publication,
                    Tag = tag
                });
            }
        }

        // Save the publication (this will also save the PublicationTag associations)
        await _publicationRepository.CreateAsync(publication);

        return publication;
    }

    public async Task<List<Tag>> FindOrCreateTagsAsync(List<string> tagNames)
    {
        var tags = new List<Tag>();

        foreach (var tagName in tagNames)
        {
            var trimmedName = tagName.Trim();
            if (string.IsNullOrWhiteSpace(trimmedName))
                continue;

            // Try to find existing tag (case-insensitive)
            var existingTag = await _tagRepository.GetByNameAsync(trimmedName);

            if (existingTag != null)
            {
                // Increment usage count
                existingTag.UsageCount++;
                await _tagRepository.UpdateAsync(existingTag);
                tags.Add(existingTag);
            }
            else
            {
                // Create new tag
                var newTag = new Tag(trimmedName) { UsageCount = 1 };
                await _tagRepository.CreateAsync(newTag);
                tags.Add(newTag);
            }
        }

        return tags;
    }

    public async Task DeleteFileAsync(string fileUrl)
    {
        if (string.IsNullOrWhiteSpace(fileUrl))
            return;

        try
        {
            // Convert relative URL to absolute file path
            // fileUrl format: "/uploads/publications/filename.pdf"
            var fileName = Path.GetFileName(fileUrl);
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "publications");
            var filePath = Path.Combine(uploadsFolder, fileName);

            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
        }
        catch (Exception ex)
        {
            // Log the error but don't throw - file cleanup is a best-effort operation
            Console.WriteLine($"Failed to delete file {fileUrl}: {ex.Message}");
        }

        await Task.CompletedTask;
    }
}
