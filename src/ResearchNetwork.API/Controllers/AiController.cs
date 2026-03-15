using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AiController : ControllerBase
{
    private readonly IPublicationRepository _publicationRepository;
    private readonly IUserRepository _userRepository;
    private readonly IAiService _aiService;

    public AiController(
        IPublicationRepository publicationRepository,
        IUserRepository userRepository,
        IAiService aiService)
    {
        _publicationRepository = publicationRepository;
        _userRepository = userRepository;
        _aiService = aiService;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var userId))
            return userId;
        return null;
    }

    // ==================== SIMILAR PUBLICATIONS ====================

    [HttpGet("publications/{id:guid}/similar")]
    public async Task<ActionResult<IEnumerable<SimilarPublicationDto>>> GetSimilarPublications(
        Guid id, [FromQuery] int topK = 5)
    {
        var embedding = await _publicationRepository.GetEmbeddingAsync(id);
        if (embedding == null)
            return Ok(new List<SimilarPublicationDto>());

        var similarIds = await _publicationRepository.FindSimilarByEmbeddingAsync(
            embedding.Embedding, topK, excludePublicationId: id);

        var results = new List<SimilarPublicationDto>();
        foreach (var (pubId, similarity) in similarIds)
        {
            var pub = await _publicationRepository.GetByIdAsync(pubId);
            if (pub == null) continue;

            results.Add(new SimilarPublicationDto(
                pub.Id,
                pub.Title,
                pub.Abstract,
                pub.Tags.Select(t => t.Tag.Name).ToList(),
                new UserSummaryDto(
                    pub.Author.Id,
                    pub.Author.FullName,
                    pub.Author.Title,
                    pub.Author.Institution,
                    pub.Author.ProfileImageUrl,
                    pub.Author.CoverImageUrl,
                    pub.Author.IsVerified
                ),
                Math.Round(similarity, 4)
            ));
        }

        return Ok(results);
    }

    // ==================== SUMMARIZATION ====================

    [HttpPost("publications/{id:guid}/summarize")]
    public async Task<ActionResult<AiSummarizeResponse>> SummarizePublication(Guid id)
    {
        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        var textToSummarize = publication.Abstract ?? publication.Title;
        var summary = await _aiService.SummarizeAsync(textToSummarize);

        return Ok(new AiSummarizeResponse(summary));
    }

    // ==================== PDF PROCESSING ====================

    [Authorize]
    [HttpPost("publications/{id:guid}/process-pdf")]
    public async Task<ActionResult<PdfProcessResultDto>> ProcessPublicationPdf(Guid id)
    {
        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        if (string.IsNullOrEmpty(publication.FileUrl))
            return BadRequest(new { message = "This publication has no uploaded file." });

        var fileName = Path.GetFileName(publication.FileUrl);
        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "publications", fileName);

        if (!System.IO.File.Exists(filePath))
            return NotFound(new { message = "File not found on server." });

        var pdfBytes = await System.IO.File.ReadAllBytesAsync(filePath);
        var result = await _aiService.ProcessPdfAsync(pdfBytes, fileName);

        bool needsUpdate = false;

        if (!string.IsNullOrEmpty(result.Abstract) && string.IsNullOrEmpty(publication.Abstract))
        {
            publication.Abstract = result.Abstract;
            needsUpdate = true;
        }

        if (!string.IsNullOrEmpty(result.Summary))
        {
            publication.Summary = result.Summary;
            needsUpdate = true;
        }

        if (needsUpdate)
        {
            await _publicationRepository.UpdateAsync(publication);
        }

        if (result.Keywords.Count > 0)
        {
            var tagNames = result.Keywords.Take(10).ToList();
            var currentTags = publication.Tags.Select(t => t.Tag.Name.ToLower()).ToHashSet();
            var newTags = tagNames.Where(k => !currentTags.Contains(k.ToLower())).ToList();

            if (newTags.Count > 0)
            {
                var publicationService = HttpContext.RequestServices.GetRequiredService<IPublicationService>();
                var tags = await publicationService.FindOrCreateTagsAsync(newTags);
                foreach (var tag in tags)
                {
                    publication.Tags.Add(new PublicationTag { Publication = publication, Tag = tag });
                }
                await _publicationRepository.UpdateAsync(publication);
            }
        }

        if (result.Embedding.Length > 0)
        {
            var embeddingEntity = new PublicationEmbedding(publication.Id, result.Embedding);
            await _publicationRepository.UpsertEmbeddingAsync(embeddingEntity);
        }

        return Ok(new PdfProcessResultDto(
            result.Abstract,
            result.Keywords,
            result.Summary,
            result.References.Count
        ));
    }

    // ==================== RESEARCHER MATCHING ====================

    [Authorize]
    [HttpGet("researchers/{userId:guid}/matches")]
    public async Task<ActionResult<IEnumerable<ResearcherMatchDto>>> GetResearcherMatches(
        Guid userId, [FromQuery] int topK = 10)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return NotFound();

        var userEmbeddings = await _publicationRepository.GetEmbeddingsByAuthorAsync(userId);
        if (userEmbeddings.Count == 0)
            return Ok(new List<ResearcherMatchDto>());

        var userProfileVector = ComputeAverageVector(userEmbeddings.Select(e => e.Embedding).ToList());
        var userTagNames = user.Tags.Select(t => t.Tag.Name.ToLower()).ToHashSet();

        var allUsers = await _userRepository.GetAllAsync();
        var results = new List<ResearcherMatchDto>();

        foreach (var candidate in allUsers)
        {
            if (candidate.Id == userId) continue;

            var candidateEmbeddings = await _publicationRepository.GetEmbeddingsByAuthorAsync(candidate.Id);
            if (candidateEmbeddings.Count == 0) continue;

            var candidateVector = ComputeAverageVector(candidateEmbeddings.Select(e => e.Embedding).ToList());
            var contentSimilarity = CosineSimilarity(userProfileVector, candidateVector);

            var candidateUser = await _userRepository.GetByIdAsync(candidate.Id);
            var candidateTagNames = candidateUser?.Tags.Select(t => t.Tag.Name.ToLower()).ToHashSet()
                                    ?? new HashSet<string>();

            var commonTags = userTagNames.Intersect(candidateTagNames).ToList();
            double tagScore = (userTagNames.Count + candidateTagNames.Count) > 0
                ? (double)commonTags.Count / userTagNames.Union(candidateTagNames).Count()
                : 0;

            var finalScore = 0.7 * contentSimilarity + 0.3 * tagScore;

            results.Add(new ResearcherMatchDto(
                candidate.Id,
                candidate.FullName,
                candidate.Title,
                candidate.Institution,
                candidate.Department,
                candidate.ProfileImageUrl,
                candidate.IsVerified,
                Math.Round(finalScore, 4),
                commonTags
            ));
        }

        return Ok(results.OrderByDescending(r => r.Similarity).Take(topK));
    }

    // ==================== HELPERS ====================

    private static float[] ComputeAverageVector(List<float[]> vectors)
    {
        if (vectors.Count == 0) return Array.Empty<float>();

        var dimension = vectors[0].Length;
        var avg = new float[dimension];

        foreach (var vec in vectors)
        {
            for (int i = 0; i < dimension; i++)
                avg[i] += vec[i];
        }

        for (int i = 0; i < dimension; i++)
            avg[i] /= vectors.Count;

        return avg;
    }

    private static double CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length != b.Length || a.Length == 0) return 0;

        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        var denominator = Math.Sqrt(normA) * Math.Sqrt(normB);
        return denominator == 0 ? 0 : dot / denominator;
    }
}
