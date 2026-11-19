using Nebula.Notifications.Domain;
using Nebula.Shared.Kernel;

namespace Nebula.Notifications.Application;

public interface INotificationsUnitOfWork : IUnitOfWork { }

public interface INotificationRepository
{
    Task<NotificationPreference?> GetPreferenceAsync(Guid userId, CancellationToken ct);
    Task<IReadOnlyList<NotificationPreference>> GetPreferencesAsync(IEnumerable<Guid> userIds, CancellationToken ct);
    Task AddPreferenceAsync(NotificationPreference p, CancellationToken ct);

    Task<ConversationSetting?> GetSettingAsync(Guid userId, Guid conversationId, CancellationToken ct);
    Task<IReadOnlyList<ConversationSetting>> GetSettingsAsync(IEnumerable<Guid> userIds, Guid conversationId, CancellationToken ct);
    Task AddSettingAsync(ConversationSetting s, CancellationToken ct);
    void RemoveSetting(ConversationSetting s);

    Task<ServerSetting?> GetServerSettingAsync(Guid userId, Guid serverId, CancellationToken ct);
    Task<IReadOnlyList<ServerSetting>> GetServerSettingsAsync(IEnumerable<Guid> userIds, Guid serverId, CancellationToken ct);
    Task<IReadOnlyList<ServerSetting>> ListServerSettingsAsync(Guid userId, CancellationToken ct);
    Task AddServerSettingAsync(ServerSetting s, CancellationToken ct);
    void RemoveServerSetting(ServerSetting s);
    Task DeleteServerSettingsAsync(Guid serverId, Guid? userId, CancellationToken ct);

    Task AddNotificationsAsync(IEnumerable<Notification> items, CancellationToken ct);
    Task<IReadOnlyList<Notification>> ListNotificationsAsync(Guid userId, bool unreadOnly, int skip, int take, CancellationToken ct);
    Task<int> CountUnreadAsync(Guid userId, CancellationToken ct);
    Task<Notification?> GetNotificationAsync(Guid id, CancellationToken ct);
    Task MarkAllReadAsync(Guid userId, CancellationToken ct);
}
