using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Enums;

namespace ResearchNetwork.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IPublicationRepository _publicationRepository;

    public SearchController(IUserRepository userRepository, IPublicationRepository publicationRepository)
    {
        _userRepository = userRepository;
        _publicationRepository = publicationRepository;
    }

    [HttpGet("users")]
    public async Task<ActionResult<PagedResult<UserSummaryDto>>> SearchUsers(
        [FromQuery] string q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? institution = null,
        [FromQuery(Name = "title")] string[]? titles = null)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
        {
            return Ok(new PagedResult<UserSummaryDto>(
                Array.Empty<UserSummaryDto>(), 0, page, pageSize, false));
        }

        var currentUserId = GetUserIdFromClaims();
        var (users, totalCount) = await _userRepository.SearchAsync(q, page, pageSize, institution, titles);

        // Filter by privacy level
        var filteredUsers = new List<UserSummaryDto>();
        foreach (var u in users)
        {
            if (u.Id == currentUserId) { /* always show self */ }
            else if (u.PrivacyLevel == PrivacyLevel.Private) continue;
            else if (u.PrivacyLevel == PrivacyLevel.ConnectionsOnly && currentUserId != null)
            {
                var follow = await _userRepository.GetFollowAsync(currentUserId.Value, u.Id);
                if (follow == null) continue;
            }
            else if (u.PrivacyLevel == PrivacyLevel.ConnectionsOnly) continue;

            filteredUsers.Add(new UserSummaryDto(
                u.Id,
                u.FullName,
                u.Title,
                u.Institution,
                u.ProfileImageUrl,
                u.CoverImageUrl,
                u.IsVerified
            ));
        }

        var result = new PagedResult<UserSummaryDto>(
            filteredUsers,
            totalCount,
            page,
            pageSize,
            page * pageSize < totalCount
        );

        return Ok(result);
    }

    [HttpGet("publications")]
    public async Task<ActionResult<PagedResult<PublicationDto>>> SearchPublications(
        [FromQuery] string q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? tag = null,
        [FromQuery] int? minRating = null,
        [FromQuery] string? sortBy = null)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
        {
            return Ok(new PagedResult<PublicationDto>(
                Array.Empty<PublicationDto>(), 0, page, pageSize, false));
        }

        var currentUserId = GetUserIdFromClaims();
        var (publications, totalCount) = await _publicationRepository.SearchAsync(q, page, pageSize, tag, minRating, sortBy);
        var dtos = new List<PublicationDto>();

        foreach (var p in publications)
        {
            // Skip publications from private authors
            if (p.Author.Id != currentUserId)
            {
                if (p.Author.PrivacyLevel == PrivacyLevel.Private) continue;
                if (p.Author.PrivacyLevel == PrivacyLevel.ConnectionsOnly)
                {
                    if (currentUserId == null) continue;
                    var follow = await _userRepository.GetFollowAsync(currentUserId.Value, p.Author.Id);
                    if (follow == null) continue;
                }
            }

            bool isSaved = false;
            bool isShared = false;
            int? userRating = null;

            if (currentUserId != null)
            {
                var saved = await _publicationRepository.GetSavedAsync(p.Id, currentUserId.Value);
                isSaved = saved != null;

                var share = await _publicationRepository.GetShareAsync(p.Id, currentUserId.Value);
                isShared = share != null;

                var rating = await _publicationRepository.GetRatingAsync(p.Id, currentUserId.Value);
                userRating = rating?.Score;
            }

            var tags = p.Tags?.Select(pt => pt.Tag.Name).ToList() ?? new List<string>();

            dtos.Add(new PublicationDto(
                p.Id,
                p.Title,
                p.Abstract,
                p.Summary,
                p.DOI,
                p.FileUrl,
                p.PublishedDate,
                tags,
                new UserSummaryDto(
                    p.Author.Id,
                    p.Author.FullName,
                    p.Author.Title,
                    p.Author.Institution,
                    p.Author.ProfileImageUrl,
                    p.Author.CoverImageUrl,
                    p.Author.IsVerified
                ),
                p.AverageRating,
                p.CitationCount,
                p.SaveCount,
                p.ShareCount,
                p.CreatedAt,
                isSaved,
                isShared,
                userRating
            ));
        }

        var result = new PagedResult<PublicationDto>(
            dtos,
            totalCount,
            page,
            pageSize,
            page * pageSize < totalCount
        );

        return Ok(result);
    }

    [HttpGet("by-tag")]
    public async Task<ActionResult> SearchByTag(
        [FromQuery] string tag,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? institution = null,
        [FromQuery(Name = "title")] string[]? titles = null,
        [FromQuery] string? tagFilter = null,
        [FromQuery] int? minRating = null,
        [FromQuery] string? sortBy = null)
    {
        if (string.IsNullOrWhiteSpace(tag) || tag.Length < 2)
        {
            return Ok(new
            {
                publications = new PagedResult<PublicationDto>(
                    Array.Empty<PublicationDto>(), 0, page, pageSize, false),
                users = new PagedResult<UserSummaryDto>(
                    Array.Empty<UserSummaryDto>(), 0, page, pageSize, false)
            });
        }

        var currentUserId = GetUserIdFromClaims();

        // Search publications by tag
        var (publications, pubTotalCount) = await _publicationRepository.SearchByTagAsync(tag, page, pageSize, tagFilter, minRating, sortBy);
        var pubDtos = new List<PublicationDto>();

        foreach (var p in publications)
        {
            // Skip publications from private authors
            if (p.Author.Id != currentUserId)
            {
                if (p.Author.PrivacyLevel == PrivacyLevel.Private) continue;
                if (p.Author.PrivacyLevel == PrivacyLevel.ConnectionsOnly)
                {
                    if (currentUserId == null) continue;
                    var follow = await _userRepository.GetFollowAsync(currentUserId.Value, p.Author.Id);
                    if (follow == null) continue;
                }
            }

            bool isSaved = false;
            bool isShared = false;
            int? userRating = null;

            if (currentUserId != null)
            {
                var saved = await _publicationRepository.GetSavedAsync(p.Id, currentUserId.Value);
                isSaved = saved != null;

                var share = await _publicationRepository.GetShareAsync(p.Id, currentUserId.Value);
                isShared = share != null;

                var rating = await _publicationRepository.GetRatingAsync(p.Id, currentUserId.Value);
                userRating = rating?.Score;
            }

            var tags = p.Tags?.Select(pt => pt.Tag.Name).ToList() ?? new List<string>();

            pubDtos.Add(new PublicationDto(
                p.Id,
                p.Title,
                p.Abstract,
                p.Summary,
                p.DOI,
                p.FileUrl,
                p.PublishedDate,
                tags,
                new UserSummaryDto(
                    p.Author.Id,
                    p.Author.FullName,
                    p.Author.Title,
                    p.Author.Institution,
                    p.Author.ProfileImageUrl,
                    p.Author.CoverImageUrl,
                    p.Author.IsVerified
                ),
                p.AverageRating,
                p.CitationCount,
                p.SaveCount,
                p.ShareCount,
                p.CreatedAt,
                isSaved,
                isShared,
                userRating
            ));
        }

        // Search users by tag
        var (users, userTotalCount) = await _userRepository.SearchByTagAsync(tag, page, pageSize, institution, titles);
        var userDtos = new List<UserSummaryDto>();
        foreach (var u in users)
        {
            if (u.Id == currentUserId) { /* always show self */ }
            else if (u.PrivacyLevel == PrivacyLevel.Private) continue;
            else if (u.PrivacyLevel == PrivacyLevel.ConnectionsOnly && currentUserId != null)
            {
                var follow = await _userRepository.GetFollowAsync(currentUserId.Value, u.Id);
                if (follow == null) continue;
            }
            else if (u.PrivacyLevel == PrivacyLevel.ConnectionsOnly) continue;

            userDtos.Add(new UserSummaryDto(
                u.Id,
                u.FullName,
                u.Title,
                u.Institution,
                u.ProfileImageUrl,
                u.CoverImageUrl,
                u.IsVerified
            ));
        }

        return Ok(new
        {
            publications = new PagedResult<PublicationDto>(
                pubDtos, pubTotalCount, page, pageSize, page * pageSize < pubTotalCount),
            users = new PagedResult<UserSummaryDto>(
                userDtos, userTotalCount, page, pageSize, page * pageSize < userTotalCount)
        });
    }

    [HttpGet("titles")]
    public async Task<ActionResult<IEnumerable<string>>> GetTitles()
    {
        var titles = await _userRepository.GetDistinctTitlesAsync();
        return Ok(titles);
    }

    private Guid? GetUserIdFromClaims()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                       ?? User.FindFirst("sub")?.Value;
        
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }

        return null;
    }
}
