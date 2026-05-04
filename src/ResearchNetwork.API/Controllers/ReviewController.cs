using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;
using ResearchNetwork.Domain.Enums;
using ResearchNetwork.API.Hubs;

namespace ResearchNetwork.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewController : ControllerBase
{
    // Only these titles are allowed to apply as reviewers and submit reviews
    private static readonly string[] ReviewerTitles =
        { "Professor", "Associate Professor", "Assistant Professor" };

    private readonly IReviewRepository _reviewRepository;
    private readonly IPublicationRepository _publicationRepository;
    private readonly INotificationRepository _notificationRepository;
    private readonly IUserRepository _userRepository;
    private readonly IHubContext<NotificationHub> _hubContext;

    public ReviewController(
        IReviewRepository reviewRepository,
        IPublicationRepository publicationRepository,
        INotificationRepository notificationRepository,
        IUserRepository userRepository,
        IHubContext<NotificationHub> hubContext)
    {
        _reviewRepository = reviewRepository;
        _publicationRepository = publicationRepository;
        _notificationRepository = notificationRepository;
        _userRepository = userRepository;
        _hubContext = hubContext;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var userId))
            return userId;
        return null;
    }

    private static bool IsEligibleReviewer(string? title) =>
        title != null && ReviewerTitles.Contains(title, StringComparer.OrdinalIgnoreCase);

    private static readonly UserSummaryDto AnonymousUser = new(
        Guid.Empty, "Anonymous", null, null, null, null, false
    );

    // viewAsAuthor=true  → author sees the review list (hide reviewer when blind)
    // viewAsAuthor=false → reviewer sees their own applications (hide author when blind)
    private static ReviewRequestDto ToDto(ReviewRequest r, bool viewAsAuthor = false)
    {
        bool isBlindActive = r.Publication.IsDoubleBlind;

        var author = (isBlindActive && !viewAsAuthor)
            ? AnonymousUser
            : new UserSummaryDto(
                r.Publication.Author.Id,
                r.Publication.Author.FullName,
                r.Publication.Author.Title,
                r.Publication.Author.Institution,
                r.Publication.Author.ProfileImageUrl,
                r.Publication.Author.CoverImageUrl,
                r.Publication.Author.IsVerified
            );

        var reviewer = (isBlindActive && viewAsAuthor)
            ? AnonymousUser
            : new UserSummaryDto(
                r.Reviewer.Id,
                r.Reviewer.FullName,
                r.Reviewer.Title,
                r.Reviewer.Institution,
                r.Reviewer.ProfileImageUrl,
                r.Reviewer.CoverImageUrl,
                r.Reviewer.IsVerified
            );

        return new ReviewRequestDto(
            r.Id,
            r.PublicationId,
            r.Publication.Title,
            r.Publication.FileUrl,
            author,
            reviewer,
            r.Status.ToString(),
            r.Message,
            r.ReviewComment,
            r.Verdict?.ToString(),
            r.Rating?.Score,
            r.CreatedAt,
            r.UpdatedAt,
            r.Publication.IsDoubleBlind
        );
    }

    // ==================== TOGGLE REVIEW SEARCH ====================

    /// <summary>
    /// Author toggles "looking for reviewers" on their publication
    /// </summary>
    [Authorize]
    [HttpPut("publication/{publicationId:guid}/toggle-search")]
    public async Task<ActionResult> ToggleReviewSearch(Guid publicationId, [FromBody] ToggleReviewSearchDto? dto = null)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var publication = await _publicationRepository.GetByIdAsync(publicationId);
        if (publication == null) return NotFound("Publication not found.");
        if (publication.AuthorId != userId.Value) return Forbid();

        bool wasLooking = publication.IsLookingForReviewers;
        publication.IsLookingForReviewers = !wasLooking;

        // Only set IsDoubleBlind when enabling review search and a value is provided
        if (!wasLooking && dto?.IsDoubleBlind.HasValue == true)
            publication.IsDoubleBlind = dto.IsDoubleBlind!.Value;

        // When disabling review search, reset double-blind too
        if (wasLooking)
            publication.IsDoubleBlind = false;

        await _publicationRepository.UpdateAsync(publication);

        return Ok(new { isLookingForReviewers = publication.IsLookingForReviewers, isDoubleBlind = publication.IsDoubleBlind });
    }

    // ==================== BROWSE ====================

    /// <summary>
    /// List publications that are looking for reviewers (projection-based)
    /// </summary>
    [Authorize]
    [HttpGet("looking-for-reviewers")]
    public async Task<ActionResult> GetPublicationsLookingForReviewers([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var userId = GetCurrentUserId();
        var (items, totalCount) = await _reviewRepository
            .GetPublicationsLookingForReviewersAsync(userId, page, pageSize);

        return Ok(new
        {
            items,
            totalCount,
            page,
            pageSize,
            hasMore = page * pageSize < totalCount
        });
    }

    /// <summary>
    /// Fetch a single reviewable publication by id (used by frontend for notification highlight targets).
    /// </summary>
    [Authorize]
    [HttpGet("looking-for-reviewers/{publicationId:guid}")]
    public async Task<ActionResult> GetReviewablePublication(Guid publicationId)
    {
        var userId = GetCurrentUserId();
        var item = await _reviewRepository.GetReviewablePublicationByIdAsync(publicationId, userId);
        if (item == null) return NotFound("Publication not found.");
        return Ok(item);
    }

    // ==================== APPLY TO REVIEW ====================

    /// <summary>
    /// Volunteer to review a publication
    /// </summary>
    [Authorize]
    [HttpPost("{publicationId:guid}/apply")]
    public async Task<ActionResult> ApplyToReview(Guid publicationId, [FromBody] CreateReviewRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        // Only professors can apply to review — tek bir basit fetch yeterli
        var currentUser = await _userRepository.GetByIdBasicAsync(userId.Value);
        if (currentUser == null) return Unauthorized();
        if (!IsEligibleReviewer(currentUser.Title))
            return StatusCode(403, "Only Professor, Associate Professor, and Assistant Professor can apply as reviewers.");

        var publication = await _publicationRepository.GetByIdAsync(publicationId);
        if (publication == null) return NotFound("Publication not found.");

        if (publication.AuthorId == userId.Value)
            return BadRequest("You cannot review your own publication.");

        if (!publication.IsLookingForReviewers)
            return BadRequest("This publication is not looking for reviewers.");

        var existing = await _reviewRepository.GetByPublicationAndReviewerAsync(publicationId, userId.Value);
        if (existing != null)
            return BadRequest("You have already applied to review this publication.");

        var reviewRequest = new ReviewRequest(publicationId, userId.Value, dto.Message);
        await _reviewRepository.CreateAsync(reviewRequest);

        // Notify the publication author (anonymize actor when double-blind)
        bool applyBlind = publication.IsDoubleBlind;
        var notification = new Notification(
            publication.AuthorId,
            "New Review Application",
            applyBlind
                ? $"A new reviewer applied to review your publication \"{publication.Title}\""
                : $"{currentUser.FullName} wants to review your publication \"{publication.Title}\"",
            NotificationType.ReviewRequested,
            $"/peer-review?tab=my-publications&highlight={publicationId}",
            applyBlind ? (Guid?)null : userId.Value,
            applyBlind ? null : currentUser.FullName,
            applyBlind ? null : currentUser.ProfileImageUrl
        );
        await _notificationRepository.AddAsync(notification);

        await PushNotificationAsync(publication.AuthorId, notification);

        return Ok(new { message = "Application submitted successfully." });
    }

    // ==================== ACCEPT / REJECT ====================

    /// <summary>
    /// Author accepts a reviewer's application
    /// </summary>
    [Authorize]
    [HttpPut("{requestId:guid}/accept")]
    public async Task<ActionResult> AcceptReviewer(Guid requestId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var request = await _reviewRepository.GetByIdAsync(requestId);
        if (request == null) return NotFound("Review request not found.");

        if (request.Publication.AuthorId != userId.Value) return Forbid();
        if (request.Status != ReviewRequestStatus.Pending)
            return BadRequest("This request is no longer pending.");

        request.Accept();
        await _reviewRepository.UpdateAsync(request);

        var author = await _userRepository.GetByIdBasicAsync(userId.Value);
        bool acceptReviewerBlind = request.Publication.IsDoubleBlind;
        var notification = new Notification(
            request.ReviewerId,
            "Review Application Accepted",
            $"Your review application for \"{request.Publication.Title}\" has been accepted.",
            NotificationType.ReviewAccepted,
            $"/peer-review?tab=my-applications&highlight={request.PublicationId}",
            acceptReviewerBlind ? (Guid?)null : userId.Value,
            acceptReviewerBlind ? null : author?.FullName,
            acceptReviewerBlind ? null : author?.ProfileImageUrl
        );
        await _notificationRepository.AddAsync(notification);

        await PushNotificationAsync(request.ReviewerId, notification);

        return Ok(new { message = "Reviewer accepted." });
    }

    /// <summary>
    /// Author rejects a reviewer's application
    /// </summary>
    [Authorize]
    [HttpPut("{requestId:guid}/reject")]
    public async Task<ActionResult> RejectReviewer(Guid requestId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var request = await _reviewRepository.GetByIdAsync(requestId);
        if (request == null) return NotFound("Review request not found.");

        if (request.Publication.AuthorId != userId.Value) return Forbid();
        if (request.Status != ReviewRequestStatus.Pending)
            return BadRequest("This request is no longer pending.");

        request.Reject();
        await _reviewRepository.UpdateAsync(request);

        return Ok(new { message = "Reviewer rejected." });
    }

    // ==================== SUBMIT REVIEW ====================

    /// <summary>
    /// Accepted reviewer submits their review
    /// </summary>
    [Authorize]
    [HttpPut("{requestId:guid}/submit")]
    public async Task<ActionResult> SubmitReview(Guid requestId, [FromBody] SubmitReviewDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var currentUser = await _userRepository.GetByIdBasicAsync(userId.Value);
        if (currentUser == null) return Unauthorized();
        if (!IsEligibleReviewer(currentUser.Title))
            return StatusCode(403, "Only Professor, Associate Professor, and Assistant Professor can submit reviews.");

        var request = await _reviewRepository.GetByIdAsync(requestId);
        if (request == null) return NotFound("Review request not found.");

        if (request.ReviewerId != userId.Value) return Forbid();
        if (request.Status != ReviewRequestStatus.Accepted)
            return BadRequest("You can only submit a review for accepted requests.");

        if (!Enum.TryParse<ReviewVerdict>(dto.Verdict, true, out var verdict))
            return BadRequest("Invalid verdict. Use: Approve, MinorRevision, MajorRevision, Reject");

        request.SubmitReview(dto.ReviewComment, verdict);
        await _reviewRepository.UpdateAsync(request);

        bool submitBlind = request.Publication.IsDoubleBlind;
        var notification = new Notification(
            request.Publication.AuthorId,
            "Review Submitted",
            submitBlind
                ? $"A reviewer has submitted a review for \"{request.Publication.Title}\""
                : $"{currentUser.FullName} has submitted a review for \"{request.Publication.Title}\"",
            NotificationType.ReviewCompleted,
            $"/peer-review?tab=my-publications&highlight={request.PublicationId}",
            submitBlind ? (Guid?)null : userId.Value,
            submitBlind ? null : currentUser.FullName,
            submitBlind ? null : currentUser.ProfileImageUrl
        );
        await _notificationRepository.AddAsync(notification);

        await PushNotificationAsync(request.Publication.AuthorId, notification);

        return Ok(new { message = "Review submitted successfully." });
    }

    // ==================== CAN REVIEW CHECK ====================

    /// <summary>
    /// Check if the current user is eligible to review (has a professor title)
    /// </summary>
    [Authorize]
    [HttpGet("can-review")]
    public async Task<ActionResult> CanReview()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _userRepository.GetByIdBasicAsync(userId.Value);
        if (user == null) return Unauthorized();

        return Ok(new { canReview = IsEligibleReviewer(user.Title) });
    }

    // ==================== QUERIES ====================

    /// <summary>
    /// Get reviewer's own applications
    /// </summary>
    [Authorize]
    [HttpGet("my-requests")]
    public async Task<ActionResult> GetMyRequests()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var requests = await _reviewRepository.GetByReviewerIdAsync(userId.Value);
        return Ok(requests.Select(r => ToDto(r, viewAsAuthor: false)));
    }

    /// <summary>
    /// Get a single review request by ID
    /// </summary>
    [Authorize]
    [HttpGet("{requestId:guid}")]
    public async Task<ActionResult> GetRequestById(Guid requestId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var request = await _reviewRepository.GetByIdAsync(requestId);
        if (request == null) return NotFound("Review request not found.");

        if (request.ReviewerId != userId.Value && request.Publication.AuthorId != userId.Value)
            return Forbid();

        bool viewAsAuthor = request.Publication.AuthorId == userId.Value;
        return Ok(ToDto(request, viewAsAuthor));
    }

    /// <summary>
    /// Get all review requests for a publication (author only)
    /// </summary>
    [Authorize]
    [HttpGet("publication/{publicationId:guid}")]
    public async Task<ActionResult> GetPublicationReviewRequests(Guid publicationId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var publication = await _publicationRepository.GetByIdAsync(publicationId);
        if (publication == null) return NotFound("Publication not found.");

        if (publication.AuthorId != userId.Value) return Forbid();

        var requests = await _reviewRepository.GetByPublicationIdAsync(publicationId);
        return Ok(requests.Select(r => ToDto(r, viewAsAuthor: true)));
    }

    /// <summary>
    /// Get the current user's publications for the review management panel (projection-based)
    /// </summary>
    [Authorize]
    [HttpGet("my-publications")]
    public async Task<ActionResult> GetMyPublicationsForReview()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var result = await _publicationRepository.GetMyPublicationsForReviewAsync(userId.Value);
        return Ok(result);
    }

    // ==================== RATE REVIEW ====================

    /// <summary>
    /// Publication author rates a completed review (1-5)
    /// </summary>
    [Authorize]
    [HttpPut("{requestId:guid}/rate")]
    public async Task<ActionResult> RateReview(Guid requestId, [FromBody] RateReviewDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (dto.Score < 1 || dto.Score > 5)
            return BadRequest("Score must be between 1 and 5.");

        var request = await _reviewRepository.GetByIdAsync(requestId);
        if (request == null) return NotFound("Review request not found.");

        if (request.Publication.AuthorId != userId.Value) return Forbid();

        if (request.Status != ReviewRequestStatus.Completed)
            return BadRequest("You can only rate completed reviews.");

        var existingRating = await _reviewRepository.GetRatingByReviewRequestIdAsync(requestId);
        if (existingRating != null)
        {
            existingRating.UpdateScore(dto.Score);
            await _reviewRepository.UpdateRatingAsync(existingRating);
        }
        else
        {
            var rating = new ReviewRating(requestId, userId.Value, dto.Score);
            await _reviewRepository.CreateRatingAsync(rating);
        }

        await UpdateReviewerAvgScore(request.ReviewerId);

        return Ok(new { message = "Review rated successfully.", score = dto.Score });
    }

    // ==================== REVIEWER SCORE ====================

    /// <summary>
    /// Get a reviewer's average score and total review count
    /// </summary>
    [HttpGet("reviewer/{userId:guid}/score")]
    public async Task<ActionResult> GetReviewerScore(Guid userId)
    {
        var user = await _userRepository.GetByIdBasicAsync(userId);
        if (user == null) return NotFound("User not found.");

        var avgScore = await _reviewRepository.CalculateReviewerAverageScoreAsync(userId);
        var completedReviews = await _reviewRepository.GetCompletedReviewCountAsync(userId);

        return Ok(new
        {
            reviewerAvgScore = avgScore,
            totalCompletedReviews = completedReviews
        });
    }

    // ==================== INVITE REVIEWER ====================

    /// <summary>
    /// Author invites a reviewer directly. Creates a ReviewRequest in the "Invited" state —
    /// the reviewer only needs to accept the invitation to start reviewing (no separate apply step).
    /// </summary>
    [Authorize]
    [HttpPost("publication/{publicationId:guid}/invite-reviewer")]
    public async Task<ActionResult> InviteReviewer(Guid publicationId, [FromBody] SendReviewInvitationDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var publication = await _publicationRepository.GetByIdAsync(publicationId);
        if (publication == null) return NotFound("Publication not found.");
        if (publication.AuthorId != userId.Value) return Forbid();

        if (dto.ReviewerId == userId.Value)
            return BadRequest("You cannot invite yourself.");

        var reviewer = await _userRepository.GetByIdBasicAsync(dto.ReviewerId);
        if (reviewer == null) return NotFound("Reviewer not found.");

        if (!IsEligibleReviewer(reviewer.Title))
            return BadRequest("This user is not eligible to be a reviewer.");

        var existing = await _reviewRepository.GetByPublicationAndReviewerAsync(publicationId, dto.ReviewerId);
        if (existing != null)
            return BadRequest("This reviewer has already been invited or has applied.");

        if (!publication.IsLookingForReviewers)
        {
            publication.IsLookingForReviewers = true;
            await _publicationRepository.UpdateAsync(publication);
        }

        var author = await _userRepository.GetByIdBasicAsync(userId.Value);

        var (_, completedReviews) = await _reviewRepository
            .GetReviewContextForPublicationAsync(publicationId, dto.ReviewerId);
        bool isRecommended = completedReviews > 0;

        bool inviteBlind = publication.IsDoubleBlind;
        string invitationMessage = inviteBlind
            ? (isRecommended
                ? $"You have been invited to review \"{publication.Title}\". You are recommended based on your past reviews in this field."
                : $"You have been invited to review \"{publication.Title}\". Your expertise matches the publication's topics.")
            : (isRecommended
                ? $"{author?.FullName} invites you to review \"{publication.Title}\". You are recommended based on your past reviews in this field."
                : $"{author?.FullName} invites you to review \"{publication.Title}\". Your expertise matches the publication's topics.");

        // Create the Invited ReviewRequest so the reviewer can accept it directly.
        var reviewRequest = ReviewRequest.CreateInvitation(publicationId, dto.ReviewerId, invitationMessage);
        await _reviewRepository.CreateAsync(reviewRequest);

        string title = isRecommended ? "Recommended: Review Invitation" : "Review Invitation";
        var notification = new Notification(
            dto.ReviewerId,
            title,
            invitationMessage,
            NotificationType.ReviewerSuggested,
            $"/peer-review?tab=my-applications&highlight={publicationId}",
            inviteBlind ? (Guid?)null : userId.Value,
            inviteBlind ? null : author?.FullName,
            inviteBlind ? null : author?.ProfileImageUrl
        );
        await _notificationRepository.AddAsync(notification);

        await PushNotificationAsync(dto.ReviewerId, notification);

        return Ok(new { message = "Invitation sent successfully.", isRecommended });
    }

    // ==================== INVITATION RESPONSE (REVIEWER SIDE) ====================

    /// <summary>
    /// Reviewer accepts an author-sent invitation. Status goes straight to Accepted,
    /// so the reviewer can submit a review without an additional approval step.
    /// </summary>
    [Authorize]
    [HttpPut("{requestId:guid}/accept-invitation")]
    public async Task<ActionResult> AcceptInvitation(Guid requestId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var request = await _reviewRepository.GetByIdAsync(requestId);
        if (request == null) return NotFound("Review request not found.");

        if (request.ReviewerId != userId.Value) return Forbid();
        if (request.Status != ReviewRequestStatus.Invited)
            return BadRequest("This request is not a pending invitation.");

        request.AcceptInvitation();
        await _reviewRepository.UpdateAsync(request);

        var reviewer = await _userRepository.GetByIdBasicAsync(userId.Value);
        bool acceptBlind = request.Publication.IsDoubleBlind;
        var notification = new Notification(
            request.Publication.AuthorId,
            "Review Invitation Accepted",
            acceptBlind
                ? $"A reviewer accepted your invitation to review \"{request.Publication.Title}\"."
                : $"{reviewer?.FullName} accepted your invitation to review \"{request.Publication.Title}\".",
            NotificationType.ReviewAccepted,
            $"/peer-review?tab=my-publications&highlight={request.PublicationId}",
            acceptBlind ? (Guid?)null : userId.Value,
            acceptBlind ? null : reviewer?.FullName,
            acceptBlind ? null : reviewer?.ProfileImageUrl
        );
        await _notificationRepository.AddAsync(notification);

        await PushNotificationAsync(request.Publication.AuthorId, notification);

        return Ok(new { message = "Invitation accepted." });
    }

    /// <summary>
    /// Reviewer declines an author-sent invitation.
    /// </summary>
    [Authorize]
    [HttpPut("{requestId:guid}/decline-invitation")]
    public async Task<ActionResult> DeclineInvitation(Guid requestId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var request = await _reviewRepository.GetByIdAsync(requestId);
        if (request == null) return NotFound("Review request not found.");

        if (request.ReviewerId != userId.Value) return Forbid();
        if (request.Status != ReviewRequestStatus.Invited)
            return BadRequest("This request is not a pending invitation.");

        request.DeclineInvitation();
        await _reviewRepository.UpdateAsync(request);

        var reviewer = await _userRepository.GetByIdBasicAsync(userId.Value);
        bool declineBlind = request.Publication.IsDoubleBlind;
        var notification = new Notification(
            request.Publication.AuthorId,
            "Review Invitation Declined",
            declineBlind
                ? $"A reviewer declined your invitation to review \"{request.Publication.Title}\"."
                : $"{reviewer?.FullName} declined your invitation to review \"{request.Publication.Title}\".",
            NotificationType.General,
            $"/peer-review?tab=my-publications&highlight={request.PublicationId}",
            declineBlind ? (Guid?)null : userId.Value,
            declineBlind ? null : reviewer?.FullName,
            declineBlind ? null : reviewer?.ProfileImageUrl
        );
        await _notificationRepository.AddAsync(notification);

        await PushNotificationAsync(request.Publication.AuthorId, notification);

        return Ok(new { message = "Invitation declined." });
    }

    private async Task UpdateReviewerAvgScore(Guid reviewerId)
    {
        var reviewer = await _userRepository.GetByIdBasicAsync(reviewerId);
        if (reviewer == null) return;

        var avgScore = await _reviewRepository.CalculateReviewerAverageScoreAsync(reviewerId);
        reviewer.UpdateReviewerScore(avgScore);
        // Change-tracker reviewer'ı takip ediyor; sadece değişen kolon UPDATE edilir.
        await _userRepository.SaveChangesAsync();
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
