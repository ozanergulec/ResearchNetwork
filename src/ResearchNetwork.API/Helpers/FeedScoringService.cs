using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.API.Helpers;

public static class FeedScoringService
{
    private const double W_RECENCY = 0.30;
    private const double W_ENGAGEMENT = 0.25;
    private const double W_FOLLOWING = 0.20;
    private const double W_TAG_RELEVANCE = 0.15;
    private const double W_AUTHOR_REP = 0.10;

    private const double RECENCY_HALF_LIFE_HOURS = 48.0;

    public static double ScorePublication(
        Publication publication,
        HashSet<Guid> followingIds,
        HashSet<string> userTagNames)
    {
        var pubTagNames = publication.Tags
            .Select(t => t.Tag.Name.ToLowerInvariant())
            .ToHashSet();

        double recency = ComputeRecency(publication.CreatedAt);
        double engagement = ComputeEngagement(
            publication.AverageRating,
            publication.SaveCount,
            publication.ShareCount,
            publication.CitationCount);
        double following = followingIds.Contains(publication.AuthorId) ? 1.0 : 0.0;
        double tagRelevance = ComputeTagRelevance(userTagNames, pubTagNames);
        double authorRep = ComputeAuthorReputation(publication.Author);

        return (recency * W_RECENCY)
             + (engagement * W_ENGAGEMENT)
             + (following * W_FOLLOWING)
             + (tagRelevance * W_TAG_RELEVANCE)
             + (authorRep * W_AUTHOR_REP);
    }

    public static double ScoreShare(
        PublicationShare share,
        HashSet<Guid> followingIds,
        HashSet<string> userTagNames)
    {
        var pubTagNames = share.Publication.Tags
            .Select(t => t.Tag.Name.ToLowerInvariant())
            .ToHashSet();

        double recency = ComputeRecency(share.SharedAt);
        double engagement = ComputeEngagement(
            share.Publication.AverageRating,
            share.Publication.SaveCount,
            share.Publication.ShareCount,
            share.Publication.CitationCount);
        double following = followingIds.Contains(share.UserId) ? 1.0 : 0.0;
        double tagRelevance = ComputeTagRelevance(userTagNames, pubTagNames);
        double authorRep = ComputeAuthorReputation(share.Publication.Author);

        return (recency * W_RECENCY)
             + (engagement * W_ENGAGEMENT)
             + (following * W_FOLLOWING)
             + (tagRelevance * W_TAG_RELEVANCE)
             + (authorRep * W_AUTHOR_REP);
    }

    /// <summary>
    /// Time decay: score drops to 0.5 after RECENCY_HALF_LIFE_HOURS.
    /// Formula: 1 / (1 + hoursAgo / halfLife)
    /// </summary>
    private static double ComputeRecency(DateTime createdAt)
    {
        double hoursAgo = (DateTime.UtcNow - createdAt).TotalHours;
        if (hoursAgo < 0) hoursAgo = 0;
        return 1.0 / (1.0 + hoursAgo / RECENCY_HALF_LIFE_HOURS);
    }

    /// <summary>
    /// Combines normalized engagement signals using log scaling to avoid
    /// high-count items from dominating.
    /// </summary>
    private static double ComputeEngagement(double avgRating, int saveCount, int shareCount, int citationCount)
    {
        double ratingScore = avgRating / 5.0;
        double saveScore = Math.Log2(1 + saveCount) / 10.0;
        double shareScore = Math.Log2(1 + shareCount) / 10.0;
        double citationScore = Math.Log2(1 + citationCount) / 10.0;

        double raw = (ratingScore * 0.4) + (saveScore * 0.25) + (shareScore * 0.2) + (citationScore * 0.15);
        return Math.Min(raw, 1.0);
    }

    /// <summary>
    /// Jaccard similarity between user interest tags and publication tags.
    /// </summary>
    private static double ComputeTagRelevance(HashSet<string> userTags, HashSet<string> pubTags)
    {
        if (userTags.Count == 0 || pubTags.Count == 0) return 0.0;

        int intersection = userTags.Count(t => pubTags.Contains(t));
        int union = userTags.Count + pubTags.Count - intersection;

        if (union == 0) return 0.0;
        return (double)intersection / union;
    }

    /// <summary>
    /// Normalized author reputation: AvgScore/5 with a small boost for verified authors.
    /// </summary>
    private static double ComputeAuthorReputation(User author)
    {
        double baseScore = author.AvgScore / 5.0;
        double verifiedBoost = author.IsVerified ? 0.15 : 0.0;
        return Math.Min(baseScore + verifiedBoost, 1.0);
    }
}
