using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;
using ResearchNetwork.Domain.Enums;

namespace ResearchNetwork.Application.Services;

public class PublicationService : IPublicationService
{
    private readonly IPublicationRepository _publicationRepository;
    private readonly ITagRepository _tagRepository;
    private readonly IUserRepository _userRepository;
    private readonly IAiService _aiService;
    private readonly INotificationRepository _notificationRepository;

    public PublicationService(
        IPublicationRepository publicationRepository,
        ITagRepository tagRepository,
        IUserRepository userRepository,
        IAiService aiService,
        INotificationRepository notificationRepository)
    {
        _publicationRepository = publicationRepository;
        _tagRepository = tagRepository;
        _userRepository = userRepository;
        _aiService = aiService;
        _notificationRepository = notificationRepository;
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

        await GenerateAiContentAsync(publication);

        // Send notifications to users whose interests or past publication tags match
        await SendTagMatchNotificationsAsync(publication, author);

        return publication;
    }

    public async Task<Publication> UpdatePublicationAsync(Guid publicationId, Guid authorId, UpdatePublicationDto dto)
    {
        var publication = await _publicationRepository.GetByIdAsync(publicationId);
        if (publication == null)
            throw new InvalidOperationException($"Publication with ID {publicationId} not found.");

        if (publication.AuthorId != authorId)
            throw new UnauthorizedAccessException("You can only edit your own publications.");

        // Update basic fields
        publication.Title = dto.Title;
        publication.Abstract = dto.Abstract;
        publication.DOI = dto.DOI;
        publication.PublishedDate = dto.PublishedDate;

        // Update tags if provided
        if (dto.Tags != null)
        {
            publication.Tags.Clear();
            if (dto.Tags.Count > 0)
            {
                var tags = await FindOrCreateTagsAsync(dto.Tags);
                foreach (var tag in tags)
                {
                    publication.Tags.Add(new PublicationTag
                    {
                        Publication = publication,
                        Tag = tag
                    });
                }
            }
        }

        await _publicationRepository.UpdateAsync(publication);

        await GenerateAiContentAsync(publication);

        return publication;
    }

    private async Task GenerateAiContentAsync(Publication publication)
    {
        try
        {
            string? pdfFullText = null;

            if (!string.IsNullOrEmpty(publication.FileUrl))
            {
                try
                {
                    var fileName = Path.GetFileName(publication.FileUrl);
                    var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "publications", fileName);

                    if (File.Exists(filePath))
                    {
                        var pdfBytes = await File.ReadAllBytesAsync(filePath);
                        var pdfResult = await _aiService.ProcessPdfAsync(pdfBytes, fileName);
                        pdfFullText = pdfResult.Full_text;

                        if (!string.IsNullOrEmpty(pdfResult.Abstract) && string.IsNullOrEmpty(publication.Abstract))
                            publication.Abstract = pdfResult.Abstract;

                        if (pdfResult.Embedding.Length > 0)
                        {
                            var embeddingEntity = new PublicationEmbedding(publication.Id, pdfResult.Embedding);
                            await _publicationRepository.UpsertEmbeddingAsync(embeddingEntity);
                        }

                        if (!string.IsNullOrWhiteSpace(pdfResult.Summary))
                        {
                            publication.Summary = pdfResult.Summary;
                            await _publicationRepository.UpdateAsync(publication);
                        }

                        if (!string.IsNullOrWhiteSpace(pdfFullText))
                        {
                            try
                            {
                                var citationAnalysisResult = await _aiService.AnalyzeCitationsAsync(pdfFullText);
                                if (citationAnalysisResult != null && citationAnalysisResult.Citations.Any())
                                {
                                    var entries = citationAnalysisResult.Citations.Select(c => new CitationAnalysisEntry
                                    {
                                        Sentence = c.Sentence,
                                        CitationNumbers = c.Citation_numbers ?? new List<int>(),
                                        Intent = c.Intent,
                                        Confidence = c.Confidence
                                    }).ToList();

                                    var analysisEntity = new CitationAnalysis(publication.Id, entries);
                                    await _publicationRepository.UpsertCitationAnalysisAsync(analysisEntity);
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[AI Service] Citation analysis failed: {ex.Message}");
                            }
                        }

                        return;
                    }
                }
                catch (Exception pdfEx)
                {
                    Console.WriteLine($"[AI Service] PDF processing failed, falling back to text-based: {pdfEx.Message}");
                }
            }

            var tagNames = publication.Tags.Select(t => t.Tag?.Name ?? "").Where(n => n.Length > 0);
            var textForEmbedding = $"{publication.Title}. {publication.Abstract ?? ""} Keywords: {string.Join(", ", tagNames)}";

            var embeddingVector = await _aiService.GetEmbeddingAsync(textForEmbedding);

            if (embeddingVector.Length > 0)
            {
                var embeddingEntity = new PublicationEmbedding(publication.Id, embeddingVector);
                await _publicationRepository.UpsertEmbeddingAsync(embeddingEntity);
            }

            var textForSummary = publication.Abstract ?? publication.Title;
            if (textForSummary.Split(' ').Length > 10)
            {
                var summary = await _aiService.SummarizeAsync(textForSummary);
                if (!string.IsNullOrWhiteSpace(summary))
                {
                    publication.Summary = summary;
                    await _publicationRepository.UpdateAsync(publication);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AI Service] AI content generation failed for publication {publication.Id}: {ex.Message}");
        }
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

    private async Task SendTagMatchNotificationsAsync(Publication publication, User author)
    {
        try
        {
            var publicationTagNames = publication.Tags
                .Select(pt => pt.Tag.Name.ToLower())
                .ToHashSet();

            if (publicationTagNames.Count == 0) return;

            var allUsers = await _userRepository.GetAllAsync();

            foreach (var user in allUsers)
            {
                // Don't notify the author about their own publication
                if (user.Id == author.Id) continue;

                // Check user's interest tags
                var userInterestTags = user.Tags
                    .Select(ut => ut.Tag.Name.ToLower())
                    .ToHashSet();

                // Check user's publication tags
                var userPublicationTags = user.Publications
                    .SelectMany(p => p.Tags)
                    .Select(pt => pt.Tag.Name.ToLower())
                    .ToHashSet();

                // Combine both sets
                var allUserTags = new HashSet<string>(userInterestTags);
                allUserTags.UnionWith(userPublicationTags);

                // Find matching tags
                var matchingTags = publicationTagNames
                    .Intersect(allUserTags)
                    .ToList();

                if (matchingTags.Count == 0) continue;

                var tagList = string.Join(", ", matchingTags.Take(3));
                var extra = matchingTags.Count > 3 ? $" +{matchingTags.Count - 3} more" : "";

                var notification = new Notification(
                    userId: user.Id,
                    title: "New publication matching your interests",
                    message: $"\"{publication.Title}\" was published by {author.FullName}. Matching tags: {tagList}{extra}",
                    type: NotificationType.Recommendation,
                    targetUrl: $"/home?pubId={publication.Id}",
                    actorId: author.Id,
                    actorName: author.FullName,
                    actorProfileImageUrl: author.ProfileImageUrl
                );

                await _notificationRepository.AddAsync(notification);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to send tag-match notifications: {ex.Message}");
        }
    }
}
