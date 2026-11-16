using Microsoft.EntityFrameworkCore;
using Nebula.Notifications.Application;
using Nebula.Notifications.Domain;

namespace Nebula.Notifications.Infrastructure;

public sealed class NotificationsDbContext(DbContextOptions<NotificationsDbContext> options) : DbContext(options), INotificationsUnitOfWork
{
    public DbSet<NotificationPreference> Preferences => Set<NotificationPreference>();
    public DbSet<ConversationSetting> ConversationSettings => Set<ConversationSetting>();
    public DbSet<ServerSetting> ServerSettings => Set<ServerSetting>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<NotificationPreference>(e =>
        {
            e.ToTable("noti_preferences");
            e.HasKey(x => x.UserId);
        });
        b.Entity<ConversationSetting>(e =>
        {
            e.ToTable("noti_conversation_settings");
            e.HasKey(x => new { x.UserId, x.ConversationId });
            e.HasIndex(x => x.ConversationId);
            e.Property(x => x.Level).HasConversion<string>().HasMaxLength(20);
        });
        b.Entity<ServerSetting>(e =>
        {
            e.ToTable("noti_server_settings");
            e.HasKey(x => new { x.UserId, x.ServerId });
            e.HasIndex(x => x.ServerId);
            e.Property(x => x.Level).HasConversion<string>().HasMaxLength(20);
        });
        b.Entity<Notification>(e =>
        {
            e.ToTable("noti_notifications");
            e.HasIndex(x => new { x.UserId, x.CreatedAt });
            e.Property(x => x.Type).HasConversion<string>().HasMaxLength(30);
            e.Property(x => x.Title).HasMaxLength(100).IsRequired();
            e.Property(x => x.Body).HasMaxLength(200).IsRequired();
            e.Property(x => x.RefType).HasMaxLength(30).IsRequired();
            e.Ignore(x => x.IsRead);
        });
    }
}

internal sealed class EfNotificationRepository(NotificationsDbContext db) : INotificationRepository
{
    public Task<NotificationPreference?> GetPreferenceAsync(Guid userId, CancellationToken ct)
        => db.Preferences.FirstOrDefaultAsync(p => p.UserId == userId, ct);

    public async Task<IReadOnlyList<NotificationPreference>> GetPreferencesAsync(IEnumerable<Guid> userIds, CancellationToken ct)
    { var ids = userIds.ToList(); return await db.Preferences.AsNoTracking().Where(p => ids.Contains(p.UserId)).ToListAsync(ct); }

    public async Task AddPreferenceAsync(NotificationPreference p, CancellationToken ct) => await db.Preferences.AddAsync(p, ct);

    public Task<ConversationSetting?> GetSettingAsync(Guid userId, Guid conversationId, CancellationToken ct)
        => db.ConversationSettings.FirstOrDefaultAsync(s => s.UserId == userId && s.ConversationId == conversationId, ct);

    public async Task<IReadOnlyList<ConversationSetting>> GetSettingsAsync(IEnumerable<Guid> userIds, Guid conversationId, CancellationToken ct)
    { var ids = userIds.ToList(); return await db.ConversationSettings.AsNoTracking().Where(s => s.ConversationId == conversationId && ids.Contains(s.UserId)).ToListAsync(ct); }

    public async Task AddSettingAsync(ConversationSetting s, CancellationToken ct) => await db.ConversationSettings.AddAsync(s, ct);
    public void RemoveSetting(ConversationSetting s) => db.ConversationSettings.Remove(s);

    public Task<ServerSetting?> GetServerSettingAsync(Guid userId, Guid serverId, CancellationToken ct)
        => db.ServerSettings.FirstOrDefaultAsync(s => s.UserId == userId && s.ServerId == serverId, ct);

    public async Task<IReadOnlyList<ServerSetting>> GetServerSettingsAsync(IEnumerable<Guid> userIds, Guid serverId, CancellationToken ct)
    { var ids = userIds.ToList(); return await db.ServerSettings.AsNoTracking().Where(s => s.ServerId == serverId && ids.Contains(s.UserId)).ToListAsync(ct); }

    public async Task<IReadOnlyList<ServerSetting>> ListServerSettingsAsync(Guid userId, CancellationToken ct)
        => await db.ServerSettings.AsNoTracking().Where(s => s.UserId == userId).ToListAsync(ct);

    public async Task AddServerSettingAsync(ServerSetting s, CancellationToken ct) => await db.ServerSettings.AddAsync(s, ct);
    public void RemoveServerSetting(ServerSetting s) => db.ServerSettings.Remove(s);

    public Task DeleteServerSettingsAsync(Guid serverId, Guid? userId, CancellationToken ct)
        => db.ServerSettings.Where(s => s.ServerId == serverId && (userId == null || s.UserId == userId)).ExecuteDeleteAsync(ct);

    public async Task AddNotificationsAsync(IEnumerable<Notification> items, CancellationToken ct) => await db.Notifications.AddRangeAsync(items, ct);

    public async Task<IReadOnlyList<Notification>> ListNotificationsAsync(Guid userId, bool unreadOnly, int skip, int take, CancellationToken ct)
        => await db.Notifications.AsNoTracking().Where(n => n.UserId == userId && (!unreadOnly || n.ReadAt == null))
            .OrderByDescending(n => n.CreatedAt).Skip(skip).Take(take).ToListAsync(ct);

    public Task<int> CountUnreadAsync(Guid userId, CancellationToken ct)
        => db.Notifications.CountAsync(n => n.UserId == userId && n.ReadAt == null, ct);

    public Task<Notification?> GetNotificationAsync(Guid id, CancellationToken ct) => db.Notifications.FirstOrDefaultAsync(n => n.Id == id, ct);

    public Task MarkAllReadAsync(Guid userId, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        return db.Notifications.Where(n => n.UserId == userId && n.ReadAt == null).ExecuteUpdateAsync(s => s.SetProperty(n => n.ReadAt, now), ct);
    }
}
