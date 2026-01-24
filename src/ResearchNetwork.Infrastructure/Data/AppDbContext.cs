using Microsoft.EntityFrameworkCore;
using ResearchNetwork.Domain.Entities;

namespace ResearchNetwork.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Publication> Publications { get; set; } = null!;
    public DbSet<SavedPublication> SavedPublications { get; set; } = null!;
    public DbSet<PublicationShare> PublicationShares { get; set; } = null!;
    public DbSet<PublicationComment> PublicationComments { get; set; } = null!;
    public DbSet<PublicationRating> PublicationRatings { get; set; } = null!;
    public DbSet<PublicationCitation> PublicationCitations { get; set; } = null!;
    public DbSet<Notification> Notifications { get; set; } = null!;
    public DbSet<Tag> Tags { get; set; } = null!;
    public DbSet<PublicationTag> PublicationTags { get; set; } = null!;
    public DbSet<UserTag> UserTags { get; set; } = null!;
    public DbSet<UserFollow> UserFollows { get; set; } = null!;
    public DbSet<VerificationCode> VerificationCodes { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Title).HasMaxLength(100);
            entity.Property(e => e.Institution).HasMaxLength(200);
            entity.Property(e => e.Department).HasMaxLength(200);
            entity.Property(e => e.Bio).HasMaxLength(2000);
        });

        // Publication configuration
        modelBuilder.Entity<Publication>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Abstract).HasMaxLength(5000);
            
            entity.HasOne(e => e.Author)
                  .WithMany(u => u.Publications)
                  .HasForeignKey(e => e.AuthorId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // SavedPublication (Composite Key)
        modelBuilder.Entity<SavedPublication>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.PublicationId });
            
            entity.HasOne(e => e.User)
                  .WithMany(u => u.SavedPublications)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
                  
            entity.HasOne(e => e.Publication)
                  .WithMany(p => p.SavedByUsers)
                  .HasForeignKey(e => e.PublicationId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // PublicationShare
        modelBuilder.Entity<PublicationShare>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.HasOne(e => e.User)
                  .WithMany(u => u.SharedPublications)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Publication)
                  .WithMany(p => p.Shares)
                  .HasForeignKey(e => e.PublicationId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // PublicationComment
        modelBuilder.Entity<PublicationComment>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Publication)
                  .WithMany(p => p.Comments)
                  .HasForeignKey(e => e.PublicationId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // PublicationRating
        modelBuilder.Entity<PublicationRating>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Publication)
                  .WithMany(p => p.Ratings)
                  .HasForeignKey(e => e.PublicationId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // PublicationCitation (User cites Publication)
        modelBuilder.Entity<PublicationCitation>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            // "Alıntılanan Yayın"
            entity.HasOne(e => e.Publication)
                  .WithMany(p => p.Citations)
                  .HasForeignKey(e => e.PublicationId)
                  .OnDelete(DeleteBehavior.Cascade);

            // "Alıntılayan Kullanıcı"
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // PublicationTag (Composite Key)
        modelBuilder.Entity<PublicationTag>(entity =>
        {
            entity.HasKey(e => new { e.PublicationId, e.TagId });
            
            entity.HasOne(e => e.Publication)
                  .WithMany(p => p.Tags)
                  .HasForeignKey(e => e.PublicationId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Tag)
                  .WithMany(t => t.PublicationTags) // Corrected from .Publications
                  .HasForeignKey(e => e.TagId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // UserTag (Composite Key)
        modelBuilder.Entity<UserTag>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.TagId });
            
            entity.HasOne(e => e.User)
                  .WithMany(u => u.Tags)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Tag)
                  .WithMany(t => t.UserTags) // Corrected from .Users
                  .HasForeignKey(e => e.TagId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // UserFollow
        modelBuilder.Entity<UserFollow>(entity =>
        {
            entity.HasKey(e => new { e.FollowerId, e.FolloweeId }); // Corrected from .FollowingId
            
            // Delete behavior RESTRICT to avoid multiple cascade paths
            entity.HasOne(e => e.Follower)
                  .WithMany(u => u.Following)
                  .HasForeignKey(e => e.FollowerId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Followee) // Corrected from .Following
                  .WithMany(u => u.Followers)
                  .HasForeignKey(e => e.FolloweeId) // Corrected from .FollowingId
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Notification
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.HasOne(e => e.User)
                  .WithMany(u => u.Notifications)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // VerificationCode
        modelBuilder.Entity<VerificationCode>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique(); 
            entity.Property(e => e.Code).IsRequired().HasMaxLength(6); // 6 karakterlik kod
        });


        // Tag configuration
        modelBuilder.Entity<Tag>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Name).IsUnique();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
        });
    }
}
