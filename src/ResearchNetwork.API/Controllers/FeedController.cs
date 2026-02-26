using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;
using ResearchNetwork.Domain.Enums;
using ResearchNetwork.API.Helpers;

namespace ResearchNetwork.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FeedController : ControllerBase
{
    private readonly IPublicationRepository _publicationRepository;
    private readonly IUserRepository _userRepository;
    private readonly INotificationRepository _notificationRepository;

    public FeedController(
        IPublicationRepository publicationRepository,
        IUserRepository userRepository,
        INotificationRepository notificationRepository)
    {
        _publicationRepository = publicationRepository;
        _userRepository = userRepository;
        _notificationRepository = notificationRepository;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var userId))
            return userId;
        return null;
    }

    // ==================== FEED ====================

    [HttpGet]
    public async Task<ActionResult<PagedResult<FeedItemDto>>> GetFeed([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;
        if (pageSize > 50) pageSize = 50;

        var currentUserId = GetCurrentUserId();

        var followingIds = new HashSet<Guid>();
        var userTagNames = new HashSet<string>();

        if (currentUserId.HasValue)
        {
            var ids = await _userRepository.GetFollowingIdsAsync(currentUserId.Value);
            followingIds = ids.ToHashSet();

            var userWithTags = await _userRepository.GetByIdWithTagsAsync(currentUserId.Value);
            if (userWithTags != null)
            {
                userTagNames = userWithTags.Tags
                    .Select(t => t.Tag.Name.ToLowerInvariant())
                    .ToHashSet();
            }
        }

        var (publications, _) = await _publicationRepository.GetFeedAsync(1, int.MaxValue);
        var (shares, _) = await _publicationRepository.GetAllSharesForFeedAsync(1, int.MaxValue);

        var scoredItems = new List<(double Score, FeedItemDto Item)>();

        foreach (var p in publications)
        {
            double score = FeedScoringService.ScorePublication(p, followingIds, userTagNames);
            var dto = await PublicationMapper.ToDto(p, _publicationRepository, currentUserId);
            scoredItems.Add((score, new FeedItemDto("publication", dto, null)));
        }

        foreach (var s in shares)
        {
            double score = FeedScoringService.ScoreShare(s, followingIds, userTagNames);
            var sharedDto = await PublicationMapper.ToSharedDto(s, _publicationRepository, currentUserId);
            scoredItems.Add((score, new FeedItemDto("share", null, sharedDto)));
        }

        var sorted = scoredItems.OrderByDescending(f => f.Score).ToList();
        var totalCount = sorted.Count;
        var paged = sorted.Skip((page - 1) * pageSize).Take(pageSize).Select(f => f.Item).ToList();

        var result = new PagedResult<FeedItemDto>(
            paged,
            totalCount,
            page,
            pageSize,
            page * pageSize < totalCount
        );

        return Ok(result);
    }

    // ==================== RATE ====================

    [Authorize]
    [HttpPost("{id:guid}/rate")]
    public async Task<ActionResult> RatePublication(Guid id, [FromBody] RatePublicationDto dto)
    {
        if (dto.Score < 0 || dto.Score > 5)
            return BadRequest(new { message = "Score must be between 0 and 5 (0 to remove)." });

        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        var existingRating = await _publicationRepository.GetRatingAsync(id, userId.Value);

        if (dto.Score == 0)
        {
            if (existingRating != null)
            {
                await _publicationRepository.RemoveRatingAsync(existingRating.Id);
            }

            var avg = await _publicationRepository.CalculateAverageRatingAsync(id);
            publication.UpdateAverageRating(avg);
            await _publicationRepository.UpdateAsync(publication);
            await UpdateAuthorAvgScore(publication.AuthorId);

            return Ok(new { averageRating = avg, userRating = (int?)null });
        }

        if (existingRating != null)
        {
            await _publicationRepository.UpdateRatingScoreAsync(existingRating.Id, dto.Score);
        }
        else
        {
            var rating = new PublicationRating(id, userId.Value, dto.Score);
            await _publicationRepository.AddRatingAsync(rating);
        }

        var newAvg = await _publicationRepository.CalculateAverageRatingAsync(id);
        publication.UpdateAverageRating(newAvg);
        await _publicationRepository.UpdateAsync(publication);
        await UpdateAuthorAvgScore(publication.AuthorId);

        // Create notification for the publication author (skip if rating own publication)
        if (publication.AuthorId != userId.Value)
        {
            var rater = await _userRepository.GetByIdAsync(userId.Value);
            if (rater != null)
            {
                var notification = new Notification(
                    userId: publication.AuthorId,
                    title: "Yayın Puanlandı",
                    message: $"{rater.FullName} yayınınızı {dto.Score} puan ile değerlendirdi: \"{publication.Title}\"",
                    type: NotificationType.PublicationRated,
                    targetUrl: $"/profile/{userId.Value}",
                    actorId: userId.Value,
                    actorName: rater.FullName,
                    actorProfileImageUrl: rater.ProfileImageUrl
                );
                await _notificationRepository.AddAsync(notification);
            }
        }

        return Ok(new { averageRating = newAvg, userRating = dto.Score });
    }

    private async Task UpdateAuthorAvgScore(Guid authorId)
    {
        var author = await _userRepository.GetByIdAsync(authorId);
        if (author == null) return;

        var authorAvg = await _publicationRepository.CalculateAuthorAverageRatingAsync(authorId);
        author.UpdateReputationScore(authorAvg);
        await _userRepository.UpdateAsync(author);
    }

    // ==================== SAVE ====================

    [Authorize]
    [HttpPost("{id:guid}/save")]
    public async Task<ActionResult> ToggleSave(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        var existing = await _publicationRepository.GetSavedAsync(id, userId.Value);
        if (existing != null)
        {
            await _publicationRepository.RemoveSavedAsync(id, userId.Value);
            publication.DecrementSaveCount();
            await _publicationRepository.UpdateAsync(publication);
            return Ok(new { saved = false, saveCount = publication.SaveCount });
        }
        else
        {
            var saved = new SavedPublication(userId.Value, id);
            await _publicationRepository.AddSavedAsync(saved);
            publication.IncrementSaveCount();
            await _publicationRepository.UpdateAsync(publication);
            return Ok(new { saved = true, saveCount = publication.SaveCount });
        }
    }

    [Authorize]
    [HttpGet("saved")]
    public async Task<ActionResult<IEnumerable<PublicationDto>>> GetSaved()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var publications = await _publicationRepository.GetSavedByUserAsync(userId.Value);
        var dtos = new List<PublicationDto>();
        foreach (var p in publications)
            dtos.Add(await PublicationMapper.ToDto(p, _publicationRepository, userId));
        return Ok(dtos);
    }

    // ==================== SHARE ====================

    [Authorize]
    [HttpPost("{id:guid}/share")]
    public async Task<ActionResult> SharePublication(Guid id, [FromBody] SharePublicationDto? dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        var existing = await _publicationRepository.GetShareAsync(id, userId.Value);
        if (existing != null)
        {
            return BadRequest(new { message = "You have already shared this publication." });
        }

        var share = new PublicationShare(userId.Value, id, dto?.Note);
        await _publicationRepository.AddShareAsync(share);
        publication.IncrementShareCount();
        await _publicationRepository.UpdateAsync(publication);

        // Create notification for the publication author (skip if sharing own publication)
        if (publication.AuthorId != userId.Value)
        {
            var sharer = await _userRepository.GetByIdAsync(userId.Value);
            if (sharer != null)
            {
                var notification = new Notification(
                    userId: publication.AuthorId,
                    title: "Yayın Paylaşıldı",
                    message: $"{sharer.FullName} yayınınızı paylaştı: \"{publication.Title}\"",
                    type: NotificationType.PublicationAlert,
                    targetUrl: $"/profile/{userId.Value}",
                    actorId: userId.Value,
                    actorName: sharer.FullName,
                    actorProfileImageUrl: sharer.ProfileImageUrl
                );
                await _notificationRepository.AddAsync(notification);
            }
        }

        return Ok(new { shared = true, shareCount = publication.ShareCount });
    }

    [Authorize]
    [HttpPut("{id:guid}/share")]
    public async Task<ActionResult> UpdateShareNote(Guid id, [FromBody] SharePublicationDto? dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        var existing = await _publicationRepository.GetShareAsync(id, userId.Value);
        if (existing == null)
        {
            return BadRequest(new { message = "You have not shared this publication." });
        }

        existing.UpdateNote(dto?.Note);
        await _publicationRepository.UpdateShareAsync(existing);

        return Ok(new { updated = true });
    }

    [Authorize]
    [HttpDelete("{id:guid}/share")]
    public async Task<ActionResult> UnsharePublication(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var publication = await _publicationRepository.GetByIdAsync(id);
        if (publication == null) return NotFound();

        var existing = await _publicationRepository.GetShareAsync(id, userId.Value);
        if (existing == null)
        {
            return BadRequest(new { message = "You have not shared this publication." });
        }

        await _publicationRepository.RemoveShareAsync(id, userId.Value);
        publication.DecrementShareCount();
        await _publicationRepository.UpdateAsync(publication);

        return Ok(new { shared = false, shareCount = publication.ShareCount });
    }

    [HttpGet("shared/{userId:guid}")]
    public async Task<ActionResult<IEnumerable<SharedPublicationDto>>> GetSharedByUser(Guid userId)
    {
        var currentUserId = GetCurrentUserId();
        var shares = await _publicationRepository.GetSharedByUserAsync(userId);
        var dtos = new List<SharedPublicationDto>();
        foreach (var s in shares)
            dtos.Add(await PublicationMapper.ToSharedDto(s, _publicationRepository, currentUserId));
        return Ok(dtos);
    }
}
