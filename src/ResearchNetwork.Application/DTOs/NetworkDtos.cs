namespace ResearchNetwork.Application.DTOs;

public record FollowDto(
    UserSummaryDto User, // The person being followed or the follower
    DateTime FollowDate
);

public record CreateFollowDto(
    Guid TargetUserId
);
