using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.API.Helpers;

public readonly record struct FeedScoreBreakdown(
    double Recency,
    double Engagement,
    double Following,
    double EffectiveFollowing,
    double TagRelevance,
    double AuthorRep,
    double BaseScore,
    double Damping,
    double Final);

public static class FeedScoringService
{
    // Linear weights for the base score (sum ≈ 1.0).
    // Recency stays dominant. Following is intentionally reduced so that
    // followed authors don't monopolize the feed; tag relevance is raised
    // so that interesting posts from non-followed authors whose topics
    // match the user's interests can still surface.
    private const double W_RECENCY = 0.41;
    private const double W_ENGAGEMENT = 0.12;
    private const double W_FOLLOWING = 0.10;
    private const double W_TAG_RELEVANCE = 0.27;
    private const double W_AUTHOR_REP = 0.10;

    // Recency decay tuning: score halves at HALF_LIFE and drops off
    // sharply thereafter thanks to the gravity exponent.
    private const double RECENCY_HALF_LIFE_HOURS = 24.0;
    private const double RECENCY_GRAVITY = 1.5;

    // Multiplicative freshness damping on the final score. Very old posts
    // keep at most FRESHNESS_FLOOR of their base score; anything younger
    // scales linearly with recency up to 1.0.
    private const double FRESHNESS_FLOOR = 0.15;

    // Secondary damping factor applied only to the engagement term. Star
    // ratings and share counts from a month ago should not be worth as
    // much as the same numbers on a post from yesterday. Floor keeps a
    // small share so truly viral old content doesn't completely vanish.
    private const double ENGAGEMENT_FRESHNESS_FLOOR = 0.20;

    // Following signal also decays with age: you follow someone to see
    // their new activity, not to be reminded of posts from a month ago.
    // Old followed posts still carry some weight (via the floor), but
    // they no longer get the full "followed author" boost forever.
    private const double FOLLOWING_FRESHNESS_FLOOR = 0.30;

    public static FeedScoreBreakdown ScorePublication(
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

        return CombineScore(recency, engagement, following, tagRelevance, authorRep);
    }

    public static FeedScoreBreakdown ScoreShare(
        PublicationShare share,
        HashSet<Guid> followingIds,
        HashSet<string> userTagNames)
    {
        var pubTagNames = share.Publication.Tags
            .Select(t => t.Tag.Name.ToLowerInvariant())
            .ToHashSet();

        // For shares, the event time is the share itself, not the original
        // publication date. This lets an older paper resurface when shared,
        // without unfairly boosting the original post.
        double recency = ComputeRecency(share.SharedAt);
        double engagement = ComputeEngagement(
            share.Publication.AverageRating,
            share.Publication.SaveCount,
            share.Publication.ShareCount,
            share.Publication.CitationCount);
        double following = followingIds.Contains(share.UserId) ? 1.0 : 0.0;
        double tagRelevance = ComputeTagRelevance(userTagNames, pubTagNames);
        double authorRep = ComputeAuthorReputation(share.Publication.Author);

        return CombineScore(recency, engagement, following, tagRelevance, authorRep);
    }

    private static FeedScoreBreakdown CombineScore(
        double recency,
        double engagement,
        double following,
        double tagRelevance,
        double authorRep)
    {
        // Age-dampen engagement: old engagement counts for less.
        double engagementFreshness = ENGAGEMENT_FRESHNESS_FLOOR
            + (1.0 - ENGAGEMENT_FRESHNESS_FLOOR) * recency;
        double effectiveEngagement = engagement * engagementFreshness;

        // Age-dampen the following signal too, so that a followed author's
        // month-old post doesn't keep getting a full "from someone you
        // follow" boost forever.
        double followingFreshness = FOLLOWING_FRESHNESS_FLOOR
            + (1.0 - FOLLOWING_FRESHNESS_FLOOR) * recency;
        double effectiveFollowing = following * followingFreshness;

        double baseScore = (recency * W_RECENCY)
                         + (effectiveEngagement * W_ENGAGEMENT)
                         + (effectiveFollowing * W_FOLLOWING)
                         + (tagRelevance * W_TAG_RELEVANCE)
                         + (authorRep * W_AUTHOR_REP);

        // Final multiplicative damping so that stale content cannot
        // dominate even if non-time signals (tags, author rep) pile up.
        double damping = FRESHNESS_FLOOR + (1.0 - FRESHNESS_FLOOR) * recency;
        double final = baseScore * damping;

        return new FeedScoreBreakdown(
            recency,
            effectiveEngagement,
            following,
            effectiveFollowing,
            tagRelevance,
            authorRep,
            baseScore,
            damping,
            final);
    }

    /// <summary>
    /// Time decay with a gravity exponent so older posts fade out faster
    /// than a plain linear half-life. Reaches ~0.5 at the half-life mark
    /// and drops off quickly beyond that.
    /// Formula: 1 / (1 + hoursAgo / halfLife)^gravity
    /// </summary>
    private static double ComputeRecency(DateTime createdAt)
    {
        double hoursAgo = (DateTime.UtcNow - createdAt).TotalHours;
        if (hoursAgo < 0) hoursAgo = 0;
        return 1.0 / Math.Pow(1.0 + hoursAgo / RECENCY_HALF_LIFE_HOURS, RECENCY_GRAVITY);
    }

    /// <summary>
    /// Combines normalized engagement signals using log scaling. Average
    /// rating is deliberately capped at a lower weight so that a post
    /// with a handful of 5-star ratings cannot dominate the feed by
    /// itself; real-traction signals (saves / shares / citations) carry
    /// most of the engagement mass.
    /// </summary>
    private static double ComputeEngagement(double avgRating, int saveCount, int shareCount, int citationCount)
    {
        double ratingScore = avgRating / 5.0;
        double saveScore = Math.Log2(1 + saveCount) / 8.0;
        double shareScore = Math.Log2(1 + shareCount) / 8.0;
        double citationScore = Math.Log2(1 + citationCount) / 8.0;

        double raw = (ratingScore * 0.25)
                   + (saveScore * 0.30)
                   + (shareScore * 0.20)
                   + (citationScore * 0.25);
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
