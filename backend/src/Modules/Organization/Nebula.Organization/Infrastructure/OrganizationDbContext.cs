using Microsoft.EntityFrameworkCore;
using Nebula.Organization.Application;
using Nebula.Organization.Domain;

namespace Nebula.Organization.Infrastructure;

public sealed class OrganizationDbContext(DbContextOptions<OrganizationDbContext> options) : DbContext(options), IOrganizationUnitOfWork
{
    public DbSet<Server> Servers => Set<Server>();
    public DbSet<ServerMember> ServerMembers => Set<ServerMember>();
    public DbSet<ServerBan> ServerBans => Set<ServerBan>();
    public DbSet<JoinRequest> JoinRequests => Set<JoinRequest>();
    public DbSet<SystemSetting> Settings => Set<SystemSetting>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Server>(e =>
        {
            e.ToTable("org_servers");
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Description).HasMaxLength(500);
            e.Property(x => x.AvatarUrl).HasMaxLength(500);
            e.Property(x => x.InviteCode).HasMaxLength(16).IsRequired();
            e.HasIndex(x => x.InviteCode).IsUnique();
            e.Property(x => x.JoinPolicy).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(x => x.Name);
            e.Ignore(x => x.OwnerId);

            // Xóa server thì xóa luôn thành viên, danh sách cấm, lời mời của server đó
            e.HasMany(x => x.Members).WithOne().HasForeignKey(m => m.ServerId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Bans).WithOne().HasForeignKey(m => m.ServerId).OnDelete(DeleteBehavior.Cascade);
            e.Navigation(x => x.Members).UsePropertyAccessMode(PropertyAccessMode.Field);
            e.Navigation(x => x.Bans).UsePropertyAccessMode(PropertyAccessMode.Field);
        });
        b.Entity<ServerMember>(e =>
        {
            e.ToTable("org_server_members");
            // Id (Guid v7) do code tự sinh. Không khai báo thế này thì EF coi thành viên MỚI thêm vào server ĐÃ TẢI là "đã tồn tại"
            // (vì Id có giá trị) và chạy UPDATE thay vì INSERT -> lỗi DbUpdateConcurrencyException khi thêm thành viên / cấm / giao chủ server.
            e.Property(x => x.Id).ValueGeneratedNever();
            e.HasIndex(x => new { x.ServerId, x.UserId }).IsUnique();
            e.HasIndex(x => x.UserId);
            e.Property(x => x.Role).HasConversion<string>().HasMaxLength(20);
        });
        b.Entity<ServerBan>(e =>
        {
            e.ToTable("org_server_bans");
            e.Property(x => x.Id).ValueGeneratedNever();   // lý do như org_server_members
            e.HasIndex(x => new { x.ServerId, x.UserId }).IsUnique();
            e.Property(x => x.Reason).HasMaxLength(500);
        });
        b.Entity<JoinRequest>(e =>
        {
            e.ToTable("org_join_requests");
            e.HasOne<Server>().WithMany().HasForeignKey(x => x.ServerId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.ServerId, x.Status });
            e.HasIndex(x => new { x.UserId, x.Status });
            e.Property(x => x.Type).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        });
        b.Entity<SystemSetting>(e =>
        {
            e.ToTable("org_settings");
            e.HasKey(x => x.Key);
            e.Property(x => x.Key).HasMaxLength(100);
            e.Property(x => x.Value).HasMaxLength(500).IsRequired();
        });
    }
}
