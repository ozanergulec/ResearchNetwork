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
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null || currentUserId.Value != userId)
            return Forbid();

        var allUsers = await _userRepository.GetAllAsync();
        var user = allUsers.FirstOrDefault(u => u.Id == userId);
        if (user == null) return NotFound();

        var userInterestTags = user.Tags.Select(t => t.Tag.Name.ToLower()).ToHashSet();

        var embeddingsByAuthor = await _publicationRepository.GetAllEmbeddingsGroupedByAuthorAsync();
        var pubTagsByAuthor = await _publicationRepository.GetPublicationTagsByAuthorAsync();

        var userVectors = embeddingsByAuthor.GetValueOrDefault(userId);
        var userPubTags = pubTagsByAuthor.GetValueOrDefault(userId) ?? new HashSet<string>();
        bool userHasEmbeddings = userVectors != null && userVectors.Count > 0;

        var results = new List<ResearcherMatchDto>();

        foreach (var candidate in allUsers)
        {
            if (candidate.Id == userId) continue;

            var candidateInterestTags = candidate.Tags
                .Select(t => t.Tag.Name.ToLower()).ToHashSet();
            var candidatePubTags = pubTagsByAuthor.GetValueOrDefault(candidate.Id)
                                   ?? new HashSet<string>();
            var candidateVectors = embeddingsByAuthor.GetValueOrDefault(candidate.Id);

            bool hasContent = userHasEmbeddings && candidateVectors != null && candidateVectors.Count > 0;
            bool hasPubTags = userPubTags.Count > 0 && candidatePubTags.Count > 0;

            double contentScore = 0;
            if (hasContent)
                contentScore = MaxPairwiseSimilarity(userVectors!, candidateVectors!);

            double interestTagScore = JaccardSimilarity(userInterestTags, candidateInterestTags);
            double pubTagScore = hasPubTags ? JaccardSimilarity(userPubTags, candidatePubTags) : 0;

            var allCommonTags = userInterestTags.Intersect(candidateInterestTags)
                .Union(userPubTags.Intersect(candidatePubTags))
                .ToList();

            double rawScore;
            if (hasContent)
                rawScore = 0.40 * contentScore + 0.30 * pubTagScore + 0.30 * interestTagScore;
            else
                rawScore = 0.50 * pubTagScore + 0.50 * interestTagScore;

            int activeSignals = (hasContent ? 1 : 0) + (hasPubTags ? 1 : 0) + (interestTagScore > 0 ? 1 : 0);
            double confidence = activeSignals switch
            {
                3 => 1.0,
                2 => 0.65,
                1 => 0.35,
                _ => 0.0
            };
            double finalScore = rawScore * confidence;

            if (finalScore < 0.01) continue;

            results.Add(new ResearcherMatchDto(
                candidate.Id,
                candidate.FullName,
                candidate.Title,
                candidate.Institution,
                candidate.Department,
                candidate.ProfileImageUrl,
                candidate.IsVerified,
                Math.Round(finalScore, 4),
                allCommonTags
            ));
        }

        return Ok(results.OrderByDescending(r => r.Similarity).Take(topK));
    }

    // ==================== CITATION ANALYSIS ====================

    [HttpGet("publications/{id:guid}/citation-analysis")]
    public async Task<ActionResult<List<CitationAnalysisDto>>> GetCitationAnalysis(Guid id)
    {
        var existing = await _publicationRepository.GetCitationAnalysisAsync(id);
        if (existing != null)
        {
            var items = existing.GetItems().Select(i => new CitationAnalysisDto(
                i.Sentence, i.CitationNumbers, i.Intent, i.Confidence
            )).ToList();
            return Ok(items);
        }

        return Ok(new List<CitationAnalysisDto>());
    }

    [Authorize]
    [HttpPost("publications/{id:guid}/analyze-citations")]
    public async Task<ActionResult<List<CitationAnalysisDto>>> AnalyzeCitations(Guid id)
    {
        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        var cached = await _publicationRepository.GetCitationAnalysisAsync(id);
        if (cached != null)
        {
            var cachedItems = cached.GetItems().Select(i => new CitationAnalysisDto(
                i.Sentence, i.CitationNumbers, i.Intent, i.Confidence
            )).ToList();
            return Ok(cachedItems);
        }

        string textToAnalyze;

        if (!string.IsNullOrEmpty(publication.FileUrl))
        {
            var fileName = Path.GetFileName(publication.FileUrl);
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "publications", fileName);

            if (System.IO.File.Exists(filePath))
            {
                var pdfBytes = await System.IO.File.ReadAllBytesAsync(filePath);
                var pdfResult = await _aiService.ProcessPdfAsync(pdfBytes, fileName);
                textToAnalyze = pdfResult.Full_text;
            }
            else
            {
                textToAnalyze = $"{publication.Title}. {publication.Abstract ?? ""}";
            }
        }
        else
        {
            textToAnalyze = $"{publication.Title}. {publication.Abstract ?? ""}";
        }

        var aiResult = await _aiService.AnalyzeCitationsAsync(textToAnalyze);

        var entries = aiResult.Citations.Select(c => new CitationAnalysisEntry
        {
            Sentence = c.Sentence,
            CitationNumbers = c.Citation_numbers,
            Intent = c.Intent,
            Confidence = c.Confidence
        }).ToList();

        var analysis = new CitationAnalysis(publication.Id, entries);
        await _publicationRepository.UpsertCitationAnalysisAsync(analysis);

        var result = entries.Select(e => new CitationAnalysisDto(
            e.Sentence, e.CitationNumbers, e.Intent, e.Confidence
        )).ToList();

        return Ok(result);
    }

    [HttpGet("publications/{id:guid}/citation-graph")]
    public async Task<ActionResult<CitationGraphDto>> GetCitationGraph(Guid id)
    {
        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        var analysis = await _publicationRepository.GetCitationAnalysisAsync(id);
        if (analysis == null)
            return Ok(new CitationGraphDto(new List<CitationGraphNodeDto>(), new List<CitationGraphEdgeDto>()));

        var items = analysis.GetItems();

        var nodes = new List<CitationGraphNodeDto>
        {
            new(publication.Id, publication.Title, "source")
        };

        var edges = new List<CitationGraphEdgeDto>();
        var addedRefs = new HashSet<int>();

        foreach (var item in items)
        {
            foreach (var citNum in item.CitationNumbers)
            {
                if (addedRefs.Add(citNum))
                {
                    var refNodeId = GenerateDeterministicGuid(publication.Id, citNum);
                    nodes.Add(new CitationGraphNodeDto(refNodeId, $"Reference [{citNum}]", "reference"));
                }

                var edgeTargetId = GenerateDeterministicGuid(publication.Id, citNum);
                edges.Add(new CitationGraphEdgeDto(
                    publication.Id,
                    edgeTargetId,
                    item.Intent,
                    Math.Round(item.Confidence, 4)
                ));
            }
        }

        return Ok(new CitationGraphDto(nodes, edges));
    }

    // ==================== AUTO-CITATION (REFERENCE MATCHING) ====================

    [Authorize]
    [HttpPost("publications/{id:guid}/auto-cite")]
    public async Task<ActionResult<AutoCitationResultDto>> AutoCiteFromReferences(Guid id)
    {
        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        var currentUserId = GetCurrentUserId();
        if (currentUserId == null) return Unauthorized();
        if (publication.AuthorId != currentUserId.Value)
            return Forbid();

        if (string.IsNullOrEmpty(publication.FileUrl))
            return BadRequest(new { message = "This publication has no uploaded PDF." });

        var fileName = Path.GetFileName(publication.FileUrl);
        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "publications", fileName);

        if (!System.IO.File.Exists(filePath))
            return NotFound(new { message = "File not found on server." });

        var pdfBytes = await System.IO.File.ReadAllBytesAsync(filePath);
        var pdfResult = await _aiService.ProcessPdfAsync(pdfBytes, fileName);

        if (pdfResult.References.Count == 0)
            return Ok(new AutoCitationResultDto(0, 0, new List<AutoCitationMatchDto>()));

        var parsedRefs = await _aiService.ParseReferencesAsync(pdfResult.References);

        var matches = new List<AutoCitationMatchDto>();

        foreach (var pRef in parsedRefs)
        {
            Publication? matched = null;
            string matchMethod = "";
            double confidence = 0;

            if (!string.IsNullOrEmpty(pRef.Doi))
            {
                matched = await _publicationRepository.GetByDoiAsync(pRef.Doi);
                if (matched != null)
                {
                    matchMethod = "DOI";
                    confidence = 1.0;
                }
            }

            if (matched == null && !string.IsNullOrEmpty(pRef.Title))
            {
                var candidates = await _publicationRepository.SearchByTitleAsync(pRef.Title);
                if (candidates.Count > 0)
                {
                    var refEmbedding = await _aiService.GetEmbeddingAsync(pRef.Title);

                    foreach (var candidate in candidates)
                    {
                        if (candidate.Id == publication.Id) continue;

                        var candidateEmbedding = await _publicationRepository.GetEmbeddingAsync(candidate.Id);
                        float[] candidateVector;

                        if (candidateEmbedding != null)
                        {
                            candidateVector = candidateEmbedding.Embedding;
                        }
                        else
                        {
                            candidateVector = await _aiService.GetEmbeddingAsync(candidate.Title);
                        }

                        var similarity = CosineSimilarity(refEmbedding, candidateVector);

                        if (similarity > 0.75 && similarity > confidence)
                        {
                            matched = candidate;
                            matchMethod = "Title Similarity";
                            confidence = similarity;
                        }
                    }
                }
            }

            if (matched != null && matched.Id != publication.Id)
            {
                var alreadyCited = await _publicationRepository.CitationExistsAsync(matched.Id, currentUserId.Value);
                if (!alreadyCited)
                {
                    var citation = new PublicationCitation(matched.Id, currentUserId.Value);
                    await _publicationRepository.AddCitationAsync(citation);
                    matched.IncrementCitationCount();
                    await _publicationRepository.UpdateAsync(matched);
                }

                matches.Add(new AutoCitationMatchDto(
                    matched.Id,
                    matched.Title,
                    matchMethod,
                    Math.Round(confidence, 4)
                ));
            }
        }

        return Ok(new AutoCitationResultDto(
            pdfResult.References.Count,
            matches.Count,
            matches
        ));
    }

    // ==================== HELPERS ====================

    private static double JaccardSimilarity(HashSet<string> setA, HashSet<string> setB)
    {
        if (setA.Count == 0 && setB.Count == 0) return 0;
        int intersection = setA.Count(t => setB.Contains(t));
        int union = setA.Count + setB.Count - intersection;
        return union > 0 ? (double)intersection / union : 0;
    }

    private static double MaxPairwiseSimilarity(List<float[]> vectorsA, List<float[]> vectorsB)
    {
        double maxSim = 0;
        foreach (var a in vectorsA)
        {
            foreach (var b in vectorsB)
            {
                var sim = CosineSimilarity(a, b);
                if (sim > maxSim) maxSim = sim;
            }
        }
        return maxSim;
    }

    private static Guid GenerateDeterministicGuid(Guid publicationId, int refNumber)
    {
        var bytes = publicationId.ToByteArray();
        var refBytes = BitConverter.GetBytes(refNumber);
        for (int i = 0; i < 4; i++)
            bytes[i] ^= refBytes[i];
        return new Guid(bytes);
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
