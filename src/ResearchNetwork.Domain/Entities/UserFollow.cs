namespace ResearchNetwork.Domain.Entities;

// Bir kullanıcının diğerini takip etme durumunu tutar.
public class UserFollow
{
    // Takip eden kullanıcının ID'si (Foreign Key)
    public Guid FollowerId { get; private set; }
    public User Follower { get; set; } = null!;

    // Takip edilen kullanıcının ID'si (Foreign Key)
    public Guid FolloweeId { get; private set; }
    public User Followee { get; set; } = null!;

    public UserFollow(Guid followerId, Guid followeeId)
    {
        FollowerId = followerId;
        FolloweeId = followeeId;
    }
}
