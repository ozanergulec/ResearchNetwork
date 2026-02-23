using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;

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
    public async Task<ActionResult<IEnumerable<UserSummaryDto>>> SearchUsers([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
        {
            return Ok(Array.Empty<UserSummaryDto>());
        }

        var users = await _userRepository.SearchAsync(q);
        var dtos = users.Select(u => new UserSummaryDto(
            u.Id,
            u.FullName,
            u.Title,
            u.Institution,
            u.ProfileImageUrl,
            u.CoverImageUrl,
            u.IsVerified
        ));

        return Ok(dtos);
    }

    [HttpGet("publications")]
    public async Task<ActionResult<IEnumerable<PublicationDto>>> SearchPublications([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
        {
            return Ok(Array.Empty<PublicationDto>());
        }

        var currentUserId = GetUserIdFromClaims();

        var publications = await _publicationRepository.SearchAsync(q);
        var dtos = new List<PublicationDto>();

        foreach (var p in publications)
        {
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

        return Ok(dtos);
    }

    [HttpGet("by-tag")]
    public async Task<ActionResult> SearchByTag([FromQuery] string tag)
    {
        if (string.IsNullOrWhiteSpace(tag) || tag.Length < 2)
        {
            return Ok(new { publications = Array.Empty<PublicationDto>(), users = Array.Empty<UserSummaryDto>() });
        }

        var currentUserId = GetUserIdFromClaims();

        // Search publications by tag
        var publications = await _publicationRepository.SearchByTagAsync(tag);
        var pubDtos = new List<PublicationDto>();

        foreach (var p in publications)
        {
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
        var users = await _userRepository.SearchByTagAsync(tag);
        var userDtos = users.Select(u => new UserSummaryDto(
            u.Id,
            u.FullName,
            u.Title,
            u.Institution,
            u.ProfileImageUrl,
            u.CoverImageUrl,
            u.IsVerified
        ));

        return Ok(new { publications = pubDtos, users = userDtos });
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

