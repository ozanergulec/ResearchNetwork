using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;
using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.API.Helpers;

public static class PublicationMapper
{
    public static async Task<PublicationDto> ToDto(
        Publication p,
        IPublicationRepository repo,
        Guid? currentUserId = null)
    {
        bool isSaved = false;
        bool isShared = false;
        int? userRating = null;

        if (currentUserId.HasValue)
        {
            var savedCheck = await repo.GetSavedAsync(p.Id, currentUserId.Value);
            isSaved = savedCheck != null;

            var shareCheck = await repo.GetShareAsync(p.Id, currentUserId.Value);
            isShared = shareCheck != null;

            var ratingCheck = await repo.GetRatingAsync(p.Id, currentUserId.Value);
            userRating = ratingCheck?.Score;
        }

        return new PublicationDto(
            p.Id,
            p.Title,
            p.Abstract,
            p.DOI,
            p.FileUrl,
            p.PublishedDate,
            p.Tags.Select(t => t.Tag.Name).ToList(),
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
        );
    }

    public static async Task<SharedPublicationDto> ToSharedDto(
        PublicationShare share,
        IPublicationRepository repo,
        Guid? currentUserId = null)
    {
        var pubDto = await ToDto(share.Publication, repo, currentUserId);
        var sharerDto = new UserSummaryDto(
            share.User.Id,
            share.User.FullName,
            share.User.Title,
            share.User.Institution,
            share.User.ProfileImageUrl,
            share.User.CoverImageUrl,
            share.User.IsVerified
        );
        return new SharedPublicationDto(
            share.Id,
            sharerDto,
            share.Note,
            share.SharedAt,
            pubDto
        );
    }
}
