using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;
using ResearchNetwork.Domain.Enums;

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

    public ReviewController(
        IReviewRepository reviewRepository,
        IPublicationRepository publicationRepository,
        INotificationRepository notificationRepository,
        IUserRepository userRepository)
    {
        _reviewRepository = reviewRepository;
        _publicationRepository = publicationRepository;
        _notificationRepository = notificationRepository;
        _userRepository = userRepository;
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

    private static ReviewRequestDto ToDto(ReviewRequest r)
    {
        return new ReviewRequestDto(
            r.Id,
            r.PublicationId,
            r.Publication.Title,
            new UserSummaryDto(
                r.Publication.Author.Id,
                r.Publication.Author.FullName,
                r.Publication.Author.Title,
                r.Publication.Author.Institution,
                r.Publication.Author.ProfileImageUrl,
                r.Publication.Author.CoverImageUrl,
                r.Publication.Author.IsVerified
            ),
            new UserSummaryDto(
                r.Reviewer.Id,
                r.Reviewer.FullName,
                r.Reviewer.Title,
                r.Reviewer.Institution,
                r.Reviewer.ProfileImageUrl,
                r.Reviewer.CoverImageUrl,
                r.Reviewer.IsVerified
            ),
            r.Status.ToString(),
            r.Message,
            r.ReviewComment,
            r.Verdict?.ToString(),
            r.CreatedAt,
            r.UpdatedAt
        );
    }

    // ==================== TOGGLE REVIEW SEARCH ====================

    /// <summary>
    /// Author toggles "looking for reviewers" on their publication
    /// </summary>
    [Authorize]
    [HttpPut("publication/{publicationId:guid}/toggle-search")]
    public async Task<ActionResult> ToggleReviewSearch(Guid publicationId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var publication = await _publicationRepository.GetByIdAsync(publicationId);
        if (publication == null) return NotFound("Publication not found.");
        if (publication.AuthorId != userId.Value) return Forbid();

        publication.IsLookingForReviewers = !publication.IsLookingForReviewers;
        await _publicationRepository.UpdateAsync(publication);

        return Ok(new { isLookingForReviewers = publication.IsLookingForReviewers });
    }

    // ==================== BROWSE ====================

    /// <summary>
    /// List publications that are looking for reviewers
    /// </summary>
    [Authorize]
    [HttpGet("looking-for-reviewers")]
    public async Task<ActionResult> GetPublicationsLookingForReviewers([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var userId = GetCurrentUserId();
        var (publications, totalCount) = await _reviewRepository.GetPublicationsLookingForReviewersAsync(page, pageSize);

        var items = publications.Select(p => new
        {
            p.Id,
            p.Title,
            p.Abstract,
            PublishedDate = p.PublishedDate,
            Tags = p.Tags.Select(t => t.Tag.Name).ToList(),
            Author = new UserSummaryDto(
                p.Author.Id,
                p.Author.FullName,
                p.Author.Title,
                p.Author.Institution,
                p.Author.ProfileImageUrl,
                p.Author.CoverImageUrl,
                p.Author.IsVerified
            ),
            ReviewRequestCount = p.ReviewRequests.Count,
            HasApplied = userId.HasValue && p.ReviewRequests.Any(r => r.ReviewerId == userId.Value),
            IsOwner = userId.HasValue && p.AuthorId == userId.Value
        });

        return Ok(new
        {
            items,
            totalCount,
            page,
            pageSize,
            hasMore = page * pageSize < totalCount
        });
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

        // Only professors can apply to review
        var currentUser = await _userRepository.GetByIdAsync(userId.Value);
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

        // Notify the publication author
        var reviewer = await _userRepository.GetByIdAsync(userId.Value);
        if (reviewer != null)
        {
            var notification = new Notification(
                publication.AuthorId,
                "New Review Application",
                $"{reviewer.FullName} wants to review your publication \"{publication.Title}\"",
                NotificationType.ReviewRequested,
                $"/peer-review?tab=my-publications",
                userId.Value,
                reviewer.FullName,
                reviewer.ProfileImageUrl
            );
            await _notificationRepository.AddAsync(notification);
        }

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

        // Notify the reviewer
        var author = await _userRepository.GetByIdAsync(userId.Value);
        var notification = new Notification(
            request.ReviewerId,
            "Review Application Accepted",
            $"Your review application for \"{request.Publication.Title}\" has been accepted.",
            NotificationType.ReviewAccepted,
                $"/peer-review?tab=my-applications",
            userId.Value,
            author?.FullName,
            author?.ProfileImageUrl
        );
        await _notificationRepository.AddAsync(notification);

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

        // Only professors can submit reviews
        var currentUser = await _userRepository.GetByIdAsync(userId.Value);
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

        // Notify the publication author
        var reviewer = await _userRepository.GetByIdAsync(userId.Value);
        var notification = new Notification(
            request.Publication.AuthorId,
            "Review Submitted",
            $"{reviewer?.FullName} has submitted a review for \"{request.Publication.Title}\"",
            NotificationType.ReviewCompleted,
                $"/peer-review?tab=my-publications",
            userId.Value,
            reviewer?.FullName,
            reviewer?.ProfileImageUrl
        );
        await _notificationRepository.AddAsync(notification);

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

        var user = await _userRepository.GetByIdAsync(userId.Value);
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
        return Ok(requests.Select(ToDto));
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
        return Ok(requests.Select(ToDto));
    }

    /// <summary>
    /// Get the current user's publications that have review search enabled
    /// </summary>
    [Authorize]
    [HttpGet("my-publications")]
    public async Task<ActionResult> GetMyPublicationsForReview()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var (publications, _) = await _publicationRepository.GetByAuthorIdAsync(userId.Value, 1, int.MaxValue);
        var result = publications.Select(p => new
        {
            p.Id,
            p.Title,
            p.Abstract,
            p.IsLookingForReviewers,
            p.CreatedAt,
            ReviewRequestCount = p.ReviewRequests?.Count ?? 0
        });

        return Ok(result);
    }
}
