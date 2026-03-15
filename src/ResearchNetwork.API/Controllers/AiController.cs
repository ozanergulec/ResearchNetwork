using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;

namespace ResearchNetwork.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AiController : ControllerBase
{
    private readonly IPublicationRepository _publicationRepository;
    private readonly IAiService _aiService;

    public AiController(
        IPublicationRepository publicationRepository,
        IAiService aiService)
    {
        _publicationRepository = publicationRepository;
        _aiService = aiService;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var userId))
            return userId;
        return null;
    }

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

    [HttpPost("publications/{id:guid}/summarize")]
    public async Task<ActionResult<AiSummarizeResponse>> SummarizePublication(Guid id)
    {
        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        var textToSummarize = publication.Abstract ?? publication.Title;
        var summary = await _aiService.SummarizeAsync(textToSummarize);

        return Ok(new AiSummarizeResponse(summary));
    }
}
