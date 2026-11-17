using Microsoft.EntityFrameworkCore;
using Nebula.Identity.Application;
using Nebula.Identity.Domain;

namespace Nebula.Identity.Infrastructure;

public sealed class IdentityDbContext(DbContextOptions<IdentityDbContext> options) : DbContext(options), IIdentityUnitOfWork
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.ToTable("identity_users");
            e.HasIndex(x => x.Email).IsUnique();
            e.HasIndex(x => x.GoogleSubject).IsUnique();
            e.Property(x => x.Email).HasMaxLength(255).IsRequired();
            e.Property(x => x.GoogleSubject).HasMaxLength(100).IsRequired();
            e.Property(x => x.PasswordHash).HasMaxLength(200);
            e.Property(x => x.UserCode).HasMaxLength(4).IsRequired();
            // ID chỉ cần duy nhất trong cùng tên
            e.HasIndex(x => new { x.DisplayName, x.UserCode }).IsUnique();
            e.Property(x => x.DisplayName).HasMaxLength(50).IsRequired();
            e.Property(x => x.AvatarUrl).HasMaxLength(500);
            e.Property(x => x.CoverUrl).HasMaxLength(500);
            e.Property(x => x.Bio).HasMaxLength(300);
            e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.LockedReason).HasMaxLength(500);
            e.Property(x => x.SystemRole).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Ignore(x => x.IsAdmin);
            e.Ignore(x => x.HasPassword);
            e.Ignore(x => x.Username);

            e.HasOne(x => x.Settings).WithOne().HasForeignKey<UserSettings>(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<UserSettings>(e =>
        {
            e.ToTable("identity_user_settings");
            e.HasKey(x => x.UserId);
        });
    }
}
