using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
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
    private readonly IMemoryCache _cache;
    private readonly ILogger<AiController> _logger;

    // Per-user recommendation cache TTL. Researcher matches don't need to be
    // recomputed on every page view; a short window avoids thrashing.
    private static readonly TimeSpan RecommendationCacheTtl = TimeSpan.FromMinutes(5);

    // Normalized-embedding map cache. Shared across all recommendation calls;
    // rebuilt when expired so new uploads are eventually reflected.
    private const string NormalizedEmbeddingsCacheKey = "ai:normalized-embeddings-by-author";
    private static readonly TimeSpan NormalizedEmbeddingsCacheTtl = TimeSpan.FromMinutes(5);

    public AiController(
        IPublicationRepository publicationRepository,
        IUserRepository userRepository,
        IAiService aiService,
        IMemoryCache cache,
        ILogger<AiController> logger)
    {
        _publicationRepository = publicationRepository;
        _userRepository = userRepository;
        _aiService = aiService;
        _cache = cache;
        _logger = logger;
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

        // Save references to disk
        var refsJson = System.Text.Json.JsonSerializer.Serialize(result.References);
        await System.IO.File.WriteAllTextAsync(filePath + ".refs.json", refsJson);

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
    public async Task<ActionResult<PagedResult<ResearcherMatchDto>>> GetResearcherMatches(
        Guid userId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null || currentUserId.Value != userId)
            return Forbid();

        var ranked = await GetOrComputeRankedMatchesAsync(userId, tagOnly: false);
        if (ranked == null) return NotFound();

        return Ok(Paginate(ranked, page, pageSize));
    }

    [Authorize]
    [HttpGet("researchers/{userId:guid}/tag-matches")]
    public async Task<ActionResult<PagedResult<ResearcherMatchDto>>> GetTagResearcherMatches(
        Guid userId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null || currentUserId.Value != userId)
            return Forbid();

        var ranked = await GetOrComputeRankedMatchesAsync(userId, tagOnly: true);
        if (ranked == null) return NotFound();

        return Ok(Paginate(ranked, page, pageSize));
    }

    private static PagedResult<ResearcherMatchDto> Paginate(
        List<ResearcherMatchDto> ranked, int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 12;
        if (pageSize > 50) pageSize = 50;

        var totalCount = ranked.Count;
        var items = ranked.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        var hasMore = page * pageSize < totalCount;
        return new PagedResult<ResearcherMatchDto>(items, totalCount, page, pageSize, hasMore);
    }

    // Returns the full sorted ranking for the user. Caches it so subsequent
    // pagination requests (infinite scroll) hit memory only. Returns null if
    // the user doesn't exist.
    private async Task<List<ResearcherMatchDto>?> GetOrComputeRankedMatchesAsync(
        Guid userId, bool tagOnly)
    {
        var cacheKey = tagOnly
            ? $"ai:researcher-tag-matches:{userId}"
            : $"ai:researcher-matches:{userId}";

        if (_cache.TryGetValue<List<ResearcherMatchDto>>(cacheKey, out var cached) && cached != null)
        {
            _logger.LogDebug("[Recommendation] cache HIT user={UserId} mode={Mode} items={Count}",
                userId, tagOnly ? "tag" : "ai", cached.Count);
            return cached;
        }

        var sw = System.Diagnostics.Stopwatch.StartNew();

        var allUsers = await _userRepository.GetAllAsync();
        var user = allUsers.FirstOrDefault(u => u.Id == userId);
        if (user == null) return null;

        var userInterestTags = user.Tags.Select(t => t.Tag.Name.ToLower()).ToHashSet();
        var userInstitution = user.Institution?.Trim().ToLowerInvariant();

        // Tag-only mode skips expensive embedding load entirely.
        Dictionary<Guid, List<float[]>>? normalizedByAuthor = tagOnly
            ? null
            : await GetOrBuildNormalizedEmbeddingsAsync();
        var pubTagsByAuthor = await _publicationRepository.GetPublicationTagsByAuthorAsync();

        var userVectors = normalizedByAuthor?.GetValueOrDefault(userId);
        var userPubTags = pubTagsByAuthor.GetValueOrDefault(userId) ?? new HashSet<string>();
        bool userHasEmbeddings = !tagOnly && userVectors != null && userVectors.Count > 0;

        var results = new List<ResearcherMatchDto>();
        var breakdowns = new List<RecommendationBreakdown>();

        int candidateCount = 0;
        int shortCircuited = 0;
        int belowThreshold = 0;

        foreach (var candidate in allUsers)
        {
            if (candidate.Id == userId) continue;
            candidateCount++;

            var candidateInterestTags = candidate.Tags
                .Select(t => t.Tag.Name.ToLower()).ToHashSet();
            var candidatePubTags = pubTagsByAuthor.GetValueOrDefault(candidate.Id)
                                   ?? new HashSet<string>();
            var candidateVectors = normalizedByAuthor?.GetValueOrDefault(candidate.Id);

            bool hasContent = userHasEmbeddings && candidateVectors != null && candidateVectors.Count > 0;
            bool hasPubTags = userPubTags.Count > 0 && candidatePubTags.Count > 0;

            double interestTagScore = JaccardSimilarity(userInterestTags, candidateInterestTags);
            double pubTagScore = hasPubTags ? JaccardSimilarity(userPubTags, candidatePubTags) : 0;

            // Short-circuit: if there is zero overlap across every signal, the
            // candidate can't produce a meaningful score. Skip before doing any
            // embedding work (which is the expensive part).
            if (!hasContent && interestTagScore == 0 && pubTagScore == 0)
            {
                shortCircuited++;
                continue;
            }

            double contentScore = 0;
            if (hasContent)
                contentScore = TopKAverageSimilarity(userVectors!, candidateVectors!, k: 3);

            var allCommonTags = userInterestTags.Intersect(candidateInterestTags)
                .Union(userPubTags.Intersect(candidatePubTags))
                .ToList();

            double rawScore;
            if (hasContent)
                rawScore = 0.40 * contentScore + 0.30 * pubTagScore + 0.30 * interestTagScore;
            else
                rawScore = 0.50 * pubTagScore + 0.50 * interestTagScore;

            // Same-institution bonus. Cheap but meaningful — colleagues are
            // naturally high-value recommendations even if embeddings are thin.
            bool sameInstitution = !string.IsNullOrEmpty(userInstitution)
                && !string.IsNullOrEmpty(candidate.Institution)
                && string.Equals(candidate.Institution.Trim(), userInstitution,
                                 StringComparison.InvariantCultureIgnoreCase);
            double institutionBonus = sameInstitution ? 0.05 : 0.0;
            rawScore += institutionBonus;

            // Smoother confidence than a step function. sqrt(n/3) gives
            // 1->0.58, 2->0.82, 3->1.0 — avoids penalising 2 strong signals
            // almost as much as a 3rd noisy one.
            int activeSignals = (hasContent ? 1 : 0)
                              + (hasPubTags ? 1 : 0)
                              + (interestTagScore > 0 ? 1 : 0);
            double confidence = activeSignals == 0 ? 0.0 : Math.Sqrt(activeSignals / 3.0);
            double finalScore = Math.Min(1.0, rawScore * confidence);

            if (finalScore < 0.05)
            {
                belowThreshold++;
                continue;
            }

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

            breakdowns.Add(new RecommendationBreakdown(
                candidate.FullName,
                contentScore, pubTagScore, interestTagScore,
                confidence, institutionBonus, activeSignals,
                finalScore));
        }

        var ranked = results.OrderByDescending(r => r.Similarity).ToList();
        _cache.Set(cacheKey, ranked, RecommendationCacheTtl);

        sw.Stop();
        LogRecommendationBreakdown(
            user, tagOnly, candidateCount, shortCircuited, belowThreshold,
            breakdowns, sw.ElapsedMilliseconds);

        return ranked;
    }

    private record RecommendationBreakdown(
        string Name,
        double Content,
        double PubTag,
        double InterestTag,
        double Confidence,
        double InstitutionBonus,
        int ActiveSignals,
        double Final);

    private void LogRecommendationBreakdown(
        User user, bool tagOnly, int total, int shortCircuited, int belowThreshold,
        List<RecommendationBreakdown> breakdowns, long elapsedMs)
    {
        if (!_logger.IsEnabled(LogLevel.Debug)) return;

        // Always log the full ranked list breakdown at debug. 5-min cache means
        // this is rare; when it runs, having every candidate visible helps
        // validate the scoring. Cap at 20 for log hygiene.
        const int MaxLogged = 20;
        var top = breakdowns.OrderByDescending(b => b.Final).Take(MaxLogged).ToList();

        var sb = new System.Text.StringBuilder();
        sb.AppendLine();
        sb.AppendLine($"[Recommendation] user={user.FullName} mode={(tagOnly ? "tag" : "ai")} " +
                      $"candidates={total} shortCircuit={shortCircuited} " +
                      $"belowThreshold={belowThreshold} kept={breakdowns.Count} elapsed={elapsedMs}ms");

        for (int i = 0; i < top.Count; i++)
        {
            var b = top[i];
            sb.AppendLine(string.Format(System.Globalization.CultureInfo.InvariantCulture,
                "  {0,2}. {1,-30} final={2:F3} content={3:F3} pubTag={4:F3} interest={5:F3} conf={6:F2} inst=+{7:F2} signals={8}",
                i + 1, Truncate(b.Name, 30),
                b.Final, b.Content, b.PubTag, b.InterestTag,
                b.Confidence, b.InstitutionBonus, b.ActiveSignals));
        }

        _logger.LogDebug("{Breakdown}", sb.ToString());
    }

    private static string Truncate(string value, int maxLength)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;
        return value.Length <= maxLength ? value : value.Substring(0, maxLength - 1) + "…";
    }

    private async Task<Dictionary<Guid, List<float[]>>> GetOrBuildNormalizedEmbeddingsAsync()
    {
        if (_cache.TryGetValue<Dictionary<Guid, List<float[]>>>(
                NormalizedEmbeddingsCacheKey, out var cached) && cached != null)
            return cached;

        var raw = await _publicationRepository.GetAllEmbeddingsGroupedByAuthorAsync();

        // Pre-normalize once so downstream similarity reduces to a dot product.
        var normalized = new Dictionary<Guid, List<float[]>>(raw.Count);
        foreach (var (authorId, vectors) in raw)
        {
            var list = new List<float[]>(vectors.Count);
            foreach (var v in vectors)
            {
                var unit = Normalize(v);
                if (unit != null) list.Add(unit);
            }
            if (list.Count > 0) normalized[authorId] = list;
        }

        _cache.Set(NormalizedEmbeddingsCacheKey, normalized, NormalizedEmbeddingsCacheTtl);
        return normalized;
    }

    // ==================== TAG SUGGESTIONS ====================

    [Authorize]
    [HttpPost("suggest-tags")]
    public async Task<ActionResult<List<string>>> SuggestTags([FromBody] SuggestTagsRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Text))
            return BadRequest("Text is required.");

        var tags = await _aiService.SuggestTagsAsync(dto.Text, dto.ExistingTags ?? new List<string>(), dto.MaxSuggestions);
        return Ok(tags);
    }

    [Authorize]
    [HttpPost("suggest-tags-from-file")]
    public async Task<ActionResult<List<string>>> SuggestTagsFromFile(
        IFormFile file,
        [FromForm] string? existingTags = null,
        [FromForm] int maxSuggestions = 6)
    {
        if (file == null || file.Length == 0)
            return BadRequest("File is required.");

        using var ms = new System.IO.MemoryStream();
        await file.CopyToAsync(ms);
        var fileBytes = ms.ToArray();

        var tagList = string.IsNullOrWhiteSpace(existingTags)
            ? new List<string>()
            : existingTags.Split(',', System.StringSplitOptions.RemoveEmptyEntries | System.StringSplitOptions.TrimEntries).ToList();

        var tags = await _aiService.SuggestTagsFromFileAsync(fileBytes, file.FileName, tagList, maxSuggestions);
        return Ok(tags);
    }

    // ==================== CITATION ANALYSIS ====================

    [HttpGet("publications/{id:guid}/citation-analysis")]
    public async Task<ActionResult<PagedResult<CitationAnalysisDto>>> GetCitationAnalysis(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;
        if (pageSize > 50) pageSize = 50;

        var existing = await _publicationRepository.GetCitationAnalysisAsync(id);
        if (existing != null)
        {
            var allItems = existing.GetItems();
            var totalCount = allItems.Count;
            var paged = allItems
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(i => new CitationAnalysisDto(i.Sentence, i.CitationNumbers, i.CitationLabels ?? new List<string>(), i.Intent, i.Confidence))
                .ToList();

            return Ok(new PagedResult<CitationAnalysisDto>(paged, totalCount, page, pageSize, page * pageSize < totalCount));
        }

        return Ok(new PagedResult<CitationAnalysisDto>(new List<CitationAnalysisDto>(), 0, page, pageSize, false));
    }

    [Authorize]
    [HttpPost("publications/{id:guid}/analyze-citations")]
    public async Task<ActionResult<List<CitationAnalysisDto>>> AnalyzeCitations(Guid id, [FromQuery] bool force = false)
    {
        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        var cached = await _publicationRepository.GetCitationAnalysisAsync(id);
        if (cached != null && !force)
        {
            var cachedItems = cached.GetItems().Select(i => new CitationAnalysisDto(
                i.Sentence, i.CitationNumbers, i.CitationLabels ?? new List<string>(), i.Intent, i.Confidence
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
                
                // Save references to disk so they can be read by CitationGraph
                var refsJson = System.Text.Json.JsonSerializer.Serialize(pdfResult.References);
                await System.IO.File.WriteAllTextAsync(filePath + ".refs.json", refsJson);
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
            CitationLabels = c.Citation_labels ?? new List<string>(),
            Intent = c.Intent,
            Confidence = c.Confidence
        }).ToList();

        var analysis = new CitationAnalysis(publication.Id, entries);
        await _publicationRepository.UpsertCitationAnalysisAsync(analysis);

        var result = entries.Select(e => new CitationAnalysisDto(
            e.Sentence, e.CitationNumbers, e.CitationLabels ?? new List<string>(), e.Intent, e.Confidence
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

        var referencesList = new List<string>();
        if (!string.IsNullOrEmpty(publication.FileUrl))
        {
            var fileName = Path.GetFileName(publication.FileUrl);
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "publications", fileName);
            var refsFilePath = filePath + ".refs.json";
            
            if (System.IO.File.Exists(refsFilePath))
            {
                try
                {
                    var refsJson = await System.IO.File.ReadAllTextAsync(refsFilePath);
                    referencesList = System.Text.Json.JsonSerializer.Deserialize<List<string>>(refsJson) ?? new List<string>();
                }
                catch { } // Ignore errors if json is malformed
            }
        }

        var addedLabelRefs = new HashSet<string>();

        foreach (var item in items)
        {
            var labels = item.CitationLabels ?? new List<string>();
            bool isAuthorYear = item.CitationNumbers.Count == 1 && item.CitationNumbers[0] == 0 && labels.Count > 0;

            if (isAuthorYear)
            {
                // Author-year citations: create nodes from labels
                foreach (var label in labels)
                {
                    var labelHash = label.GetHashCode();
                    var refNodeId = GenerateDeterministicGuid(publication.Id, labelHash);

                    if (addedLabelRefs.Add(label))
                    {
                        nodes.Add(new CitationGraphNodeDto(refNodeId, label, "reference"));
                    }

                    edges.Add(new CitationGraphEdgeDto(
                        publication.Id,
                        refNodeId,
                        item.Intent,
                        Math.Round(item.Confidence, 4),
                        item.Sentence
                    ));
                }
            }
            else
            {
                // Numbered citations: original logic
                foreach (var citNum in item.CitationNumbers)
                {
                    if (addedRefs.Add(citNum))
                    {
                        var refNodeId = GenerateDeterministicGuid(publication.Id, citNum);
                        string refTitle = $"Reference [{citNum}]";
                        
                        if (citNum > 0 && citNum <= referencesList.Count)
                        {
                            var rawRef = referencesList[citNum - 1];
                            var truncated = rawRef.Length > 80 ? rawRef.Substring(0, 80) + "..." : rawRef;
                            refTitle = $"[{citNum}] {truncated}";
                        }

                        nodes.Add(new CitationGraphNodeDto(refNodeId, refTitle, "reference"));
                    }

                    var edgeTargetId = GenerateDeterministicGuid(publication.Id, citNum);
                    edges.Add(new CitationGraphEdgeDto(
                        publication.Id,
                        edgeTargetId,
                        item.Intent,
                        Math.Round(item.Confidence, 4),
                        item.Sentence
                    ));
                }
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

    // ==================== RAG — Article Chat ====================

    [Authorize]
    [HttpPost("publications/{id:guid}/rag/index")]
    public async Task<ActionResult<ArticleIndexResponse>> IndexArticleForRag(Guid id)
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
        var pdfResult = await _aiService.ProcessPdfAsync(pdfBytes, fileName);

        var ragResult = await _aiService.IndexArticleForRagAsync(
            id.ToString(), pdfResult.Full_text);

        return Ok(new ArticleIndexResponse(ragResult.Chunk_count, ragResult.Status));
    }

    [Authorize]
    [HttpPost("publications/{id:guid}/rag/ask")]
    public async Task<ActionResult<ArticleChatResponse>> AskArticleQuestion(
        Guid id, [FromBody] ArticleChatRequest request)
    {
        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.Question))
            return BadRequest(new { message = "Question is required." });

        var ragResult = await _aiService.AskArticleQuestionAsync(
            id.ToString(), request.Question);

        var sources = ragResult.Sources.Select(s => new ArticleChatSource(
            s.Chunk_index, s.Text, s.Score
        )).ToList();

        return Ok(new ArticleChatResponse(ragResult.Answer, sources, ragResult.From_cache));
    }

    [HttpGet("publications/{id:guid}/rag/status")]
    public async Task<ActionResult<ArticleIndexStatusResponse>> GetRagIndexStatus(Guid id)
    {
        var result = await _aiService.GetRagIndexStatusAsync(id.ToString());
        return Ok(new ArticleIndexStatusResponse(result.Is_indexed));
    }

    // ==================== HELPERS ====================

    private static double JaccardSimilarity(HashSet<string> setA, HashSet<string> setB)
    {
        if (setA.Count == 0 && setB.Count == 0) return 0;
        int intersection = setA.Count(t => setB.Contains(t));
        int union = setA.Count + setB.Count - intersection;
        return union > 0 ? (double)intersection / union : 0;
    }

    // Average of the top-K pairwise similarities. More robust than MAX (which
    // lets a single coincidentally-similar paper dominate the score) while
    // still rewarding authors whose strongest work overlaps with ours.
    private static double TopKAverageSimilarity(List<float[]> unitVectorsA, List<float[]> unitVectorsB, int k = 3)
    {
        if (unitVectorsA.Count == 0 || unitVectorsB.Count == 0) return 0;

        var sims = new List<double>(unitVectorsA.Count * unitVectorsB.Count);
        foreach (var a in unitVectorsA)
            foreach (var b in unitVectorsB)
                sims.Add(DotProduct(a, b));

        sims.Sort((x, y) => y.CompareTo(x));
        var take = Math.Min(k, sims.Count);
        double sum = 0;
        for (int i = 0; i < take; i++) sum += sims[i];
        return sum / take;
    }

    private static float[]? Normalize(float[] v)
    {
        if (v == null || v.Length == 0) return null;
        double norm = 0;
        for (int i = 0; i < v.Length; i++) norm += v[i] * v[i];
        norm = Math.Sqrt(norm);
        if (norm == 0) return null;

        var unit = new float[v.Length];
        var inv = (float)(1.0 / norm);
        for (int i = 0; i < v.Length; i++) unit[i] = v[i] * inv;
        return unit;
    }

    private static double DotProduct(float[] a, float[] b)
    {
        if (a.Length != b.Length) return 0;
        double dot = 0;
        for (int i = 0; i < a.Length; i++) dot += a[i] * b[i];
        return dot;
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
