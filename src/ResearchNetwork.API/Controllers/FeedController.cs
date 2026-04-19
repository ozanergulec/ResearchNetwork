using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;
using ResearchNetwork.Domain.Enums;
using ResearchNetwork.API.Helpers;
using ResearchNetwork.API.Hubs;

namespace ResearchNetwork.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FeedController : ControllerBase
{
    private readonly IPublicationRepository _publicationRepository;
    private readonly IUserRepository _userRepository;
    private readonly INotificationRepository _notificationRepository;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<FeedController> _logger;

    public FeedController(
        IPublicationRepository publicationRepository,
        IUserRepository userRepository,
        INotificationRepository notificationRepository,
        IHubContext<NotificationHub> hubContext,
        ILogger<FeedController> logger)
    {
        _publicationRepository = publicationRepository;
        _userRepository = userRepository;
        _notificationRepository = notificationRepository;
        _hubContext = hubContext;
        _logger = logger;
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

        var scoredItems = new List<(FeedScoreBreakdown Score, FeedItemDto Item, string DebugLabel, DateTime EventAt)>();

        foreach (var p in publications)
        {
            var score = FeedScoringService.ScorePublication(p, followingIds, userTagNames);
            var dto = await PublicationMapper.ToDto(p, _publicationRepository, currentUserId);
            var label = $"pub[{Truncate(p.Title, 40)}]";
            scoredItems.Add((score, new FeedItemDto("publication", dto, null), label, p.CreatedAt));
        }

        foreach (var s in shares)
        {
            var score = FeedScoringService.ScoreShare(s, followingIds, userTagNames);
            var sharedDto = await PublicationMapper.ToSharedDto(s, _publicationRepository, currentUserId);
            var label = $"share[{Truncate(s.Publication.Title, 40)}]";
            scoredItems.Add((score, new FeedItemDto("share", null, sharedDto), label, s.SharedAt));
        }

        var sorted = scoredItems.OrderByDescending(f => f.Score.Final).ToList();
        var totalCount = sorted.Count;
        var paged = sorted.Skip((page - 1) * pageSize).Take(pageSize).Select(f => f.Item).ToList();

        if (_logger.IsEnabled(LogLevel.Debug))
        {
            LogFeedRanking(currentUserId, sorted, page, pageSize);
        }

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
                    title: "Publication Rated",
                    message: $"{rater.FullName} rated your publication with {dto.Score} stars: \"{publication.Title}\"",
                    type: NotificationType.PublicationRated,
                    targetUrl: $"/home?pubId={id}",
                    actorId: userId.Value,
                    actorName: rater.FullName,
                    actorProfileImageUrl: rater.ProfileImageUrl
                );
                await _notificationRepository.AddAsync(notification);

                // Push real-time notification via SignalR
                await PushNotificationAsync(publication.AuthorId, notification);
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
    public async Task<ActionResult<PagedResult<PublicationDto>>> GetSaved([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var (publications, totalCount) = await _publicationRepository.GetSavedByUserAsync(userId.Value, page, pageSize);
        var dtos = new List<PublicationDto>();
        foreach (var p in publications)
            dtos.Add(await PublicationMapper.ToDto(p, _publicationRepository, userId));
            
        return Ok(new PagedResult<PublicationDto>(
            dtos,
            totalCount,
            page,
            pageSize,
            page * pageSize < totalCount
        ));
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
                    title: "Publication Shared",
                    message: $"{sharer.FullName} shared your publication: \"{publication.Title}\"",
                    type: NotificationType.PublicationAlert,
                    targetUrl: $"/home?shareId={share.Id}",
                    actorId: userId.Value,
                    actorName: sharer.FullName,
                    actorProfileImageUrl: sharer.ProfileImageUrl
                );
                await _notificationRepository.AddAsync(notification);

                // Push real-time notification via SignalR
                await PushNotificationAsync(publication.AuthorId, notification);
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
    public async Task<ActionResult<PagedResult<SharedPublicationDto>>> GetSharedByUser(Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var currentUserId = GetCurrentUserId();
        var (shares, totalCount) = await _publicationRepository.GetSharedByUserAsync(userId, page, pageSize);
        var dtos = new List<SharedPublicationDto>();
        foreach (var s in shares)
            dtos.Add(await PublicationMapper.ToSharedDto(s, _publicationRepository, currentUserId));
            
        return Ok(new PagedResult<SharedPublicationDto>(
            dtos,
            totalCount,
            page,
            pageSize,
            page * pageSize < totalCount
        ));
    }

    [HttpGet("user/{userId:guid}/posts")]
    public async Task<ActionResult<PagedResult<FeedItemDto>>> GetUserPosts(Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var currentUserId = GetCurrentUserId();

        // Fetch all items from repositories limit-free, then paginate in memory to maintain chronological order
        var (publications, _) = await _publicationRepository.GetByAuthorIdAsync(userId, 1, int.MaxValue);
        var (shares, _) = await _publicationRepository.GetSharedByUserAsync(userId, 1, int.MaxValue);

        var timelineItems = new List<(DateTime Date, FeedItemDto Item)>();

        foreach (var p in publications)
        {
            var dto = await PublicationMapper.ToDto(p, _publicationRepository, currentUserId);
            timelineItems.Add((p.CreatedAt, new FeedItemDto("publication", dto, null)));
        }

        foreach (var s in shares)
        {
            var sharedDto = await PublicationMapper.ToSharedDto(s, _publicationRepository, currentUserId);
            timelineItems.Add((s.SharedAt, new FeedItemDto("share", null, sharedDto)));
        }

        var sorted = timelineItems.OrderByDescending(t => t.Date).ToList();
        var totalCount = sorted.Count;
        var paged = sorted.Skip((page - 1) * pageSize).Take(pageSize).Select(t => t.Item).ToList();

        return Ok(new PagedResult<FeedItemDto>(
            paged,
            totalCount,
            page,
            pageSize,
            page * pageSize < totalCount
        ));
    }

    private static string Truncate(string input, int max)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;
        return input.Length <= max ? input : input.Substring(0, max) + "...";
    }

    private void LogFeedRanking(
        Guid? userId,
        List<(FeedScoreBreakdown Score, FeedItemDto Item, string DebugLabel, DateTime EventAt)> sorted,
        int page,
        int pageSize)
    {
        var now = DateTime.UtcNow;
        var top = sorted.Take(Math.Min(sorted.Count, pageSize + 5)).ToList();
        _logger.LogDebug(
            "[Feed] user={UserId} page={Page} pageSize={PageSize} totalItems={Total} topItems={TopCount}",
            userId, page, pageSize, sorted.Count, top.Count);

        for (int i = 0; i < top.Count; i++)
        {
            var entry = top[i];
            double ageHours = (now - entry.EventAt).TotalHours;
            var s = entry.Score;
            _logger.LogDebug(
                "[Feed] #{Rank,2} final={Final:F4} base={Base:F4} damp={Damp:F3} | rec={Rec:F4} eng={Eng:F4} fol={FolRaw:F0}->{FolEff:F3} tag={Tag:F2} aut={Aut:F2} | age={AgeH:F1}h | {Label}",
                i + 1, s.Final, s.BaseScore, s.Damping,
                s.Recency, s.Engagement, s.Following, s.EffectiveFollowing, s.TagRelevance, s.AuthorRep,
                ageHours, entry.DebugLabel);
        }
    }

    private async Task PushNotificationAsync(Guid targetUserId, Notification notification)
    {
        try
        {
            var dto = new NotificationDto(
                notification.Id,
                notification.Title,
                notification.Message,
                notification.TargetUrl,
                notification.Type,
                notification.IsRead,
                notification.CreatedAt,
                notification.ActorId,
                notification.ActorName,
                notification.ActorProfileImageUrl
            );
            await _hubContext.Clients.Group(targetUserId.ToString())
                .SendAsync("ReceiveNotification", dto);

            var unreadCount = await _notificationRepository.GetUnreadCountAsync(targetUserId);
            await _hubContext.Clients.Group(targetUserId.ToString())
                .SendAsync("UpdateUnreadCount", unreadCount);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SignalR] Failed to push notification to {targetUserId}: {ex.Message}");
        }
    }
}
