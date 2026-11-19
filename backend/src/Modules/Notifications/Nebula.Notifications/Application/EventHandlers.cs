using Nebula.Notifications.Domain;
using Nebula.Shared.Contracts;

namespace Nebula.Notifications.Application;

public sealed class MessageSentHandler(INotificationRepository repo, Notifier notifier) : IEventHandler<MessageSent>
{
    public async Task HandleAsync(MessageSent e, CancellationToken ct)
    {
        var targets = e.RecipientIds.Where(id => e.IsDirect || e.MentionedUserIds.Contains(id)).ToList();
        if (targets.Count == 0) return;   // tin thường trong kênh: không tạo thông báo

        var prefs = (await repo.GetPreferencesAsync(targets, ct)).ToDictionary(p => p.UserId);
        var settings = (await repo.GetSettingsAsync(targets, e.ConversationId, ct)).ToDictionary(s => s.UserId);
        var serverSettings = e.ServerId is Guid gid
            ? (await repo.GetServerSettingsAsync(targets, gid, ct)).ToDictionary(s => s.UserId)
            : [];
        var preview = e.Content.Length == 0 ? "📎 Đã gửi file" : e.Content;
        var now = DateTime.UtcNow;

        var items = new List<Notification>();
        foreach (var userId in targets)
        {
            var mentioned = e.MentionedUserIds.Contains(userId);
            var pref = prefs.GetValueOrDefault(userId) ?? NotificationPreference.CreateDefault(userId);
            if (!pref.ShouldNotify(mentioned, e.IsDirect, settings.GetValueOrDefault(userId), now, serverSettings.GetValueOrDefault(userId))) continue;

            items.Add(mentioned
                ? Notification.Create(userId, NotificationType.Mention, "Bạn được nhắc đến", preview, "Conversation", e.ConversationId, e.SenderId)
                : Notification.Create(userId, NotificationType.DirectMessage, "Tin nhắn mới", preview, "Conversation", e.ConversationId, e.SenderId));
        }
        await notifier.SendAsync(items, ct);
    }
}

public sealed class ServerNotificationHandler(Notifier notifier)
    : IEventHandler<ServerCreated>, IEventHandler<MemberAddedToServer>, IEventHandler<MemberRemovedFromServer>,
      IEventHandler<MemberRoleChanged>, IEventHandler<JoinRequestCreated>
{
    private static readonly Dictionary<string, string> RoleNames = new() { ["Owner"] = "chủ server", ["Moderator"] = "quản trị viên", ["Member"] = "thành viên" };

    public Task HandleAsync(ServerCreated e, CancellationToken ct)
        => e.OwnerId == e.ActorId ? Task.CompletedTask : notifier.SendAsync(
            [Notification.Create(e.OwnerId, NotificationType.ServerOwner, "Bạn được giao làm chủ server", $"Server \"{e.Name}\"", "Server", e.ServerId, e.ActorId)], ct);

    public Task HandleAsync(MemberAddedToServer e, CancellationToken ct)
        => e.UserId == e.ActorId ? Task.CompletedTask : notifier.SendAsync(
            [Notification.Create(e.UserId, NotificationType.AddedToServer, "Bạn được thêm vào server", $"Server \"{e.ServerName}\"", "Server", e.ServerId, e.ActorId)], ct);

    public Task HandleAsync(MemberRemovedFromServer e, CancellationToken ct)
        => e.Reason == "Left" ? Task.CompletedTask : notifier.SendAsync(
            [Notification.Create(e.UserId, NotificationType.RemovedFromServer,
                e.Reason == "Banned" ? "Bạn bị cấm khỏi server" : "Bạn bị xóa khỏi server", $"Server \"{e.ServerName}\"", "Server", e.ServerId, e.ActorId)], ct);

    public Task HandleAsync(MemberRoleChanged e, CancellationToken ct)
        => notifier.SendAsync(
            [Notification.Create(e.UserId, NotificationType.RoleChanged, "Chức vụ của bạn thay đổi",
                $"Bạn giờ là {RoleNames.GetValueOrDefault(e.NewRole, e.NewRole)} của server \"{e.ServerName}\"", "Server", e.ServerId, e.ActorId)], ct);

    public Task HandleAsync(JoinRequestCreated e, CancellationToken ct)
        => notifier.SendAsync(e.NotifyUserIds.Select(userId => Notification.Create(userId, NotificationType.JoinRequest,
                e.Type == "Invite" ? "Bạn được mời vào server" : "Có người xin vào server", $"Server \"{e.ServerName}\"", "JoinRequest", e.RequestId, e.ActorId)).ToList(), ct);
}

public sealed class UserStatusChangedHandler(INotificationRepository repo, INotificationsUnitOfWork uow) : IEventHandler<UserStatusChanged>
{
    public async Task HandleAsync(UserStatusChanged e, CancellationToken ct)
    {
        var dnd = e.Status == "DoNotDisturb";
        var p = await repo.GetPreferenceAsync(e.UserId, ct);
        if (p is null)
        {
            if (!dnd) return;
            p = NotificationPreference.CreateDefault(e.UserId);
            await repo.AddPreferenceAsync(p, ct);
        }
        p.SetDoNotDisturb(dnd);
        await uow.SaveChangesAsync(ct);
    }
}

public sealed class FriendNotificationHandler(Notifier notifier) : IEventHandler<FriendRequestSent>, IEventHandler<FriendRequestAccepted>
{
    public Task HandleAsync(FriendRequestSent e, CancellationToken ct)
        => notifier.SendAsync([Notification.Create(e.AddresseeId, NotificationType.FriendRequest, "Lời mời kết bạn",
            "Có người muốn kết bạn với bạn", "Friend", e.RequestId, e.RequesterId)], ct);

    public Task HandleAsync(FriendRequestAccepted e, CancellationToken ct)
        => notifier.SendAsync([Notification.Create(e.RequesterId, NotificationType.FriendAccepted, "Đã trở thành bạn bè",
            "Lời mời kết bạn của bạn đã được chấp nhận", "Friend", e.RequestId, e.AddresseeId)], ct);
}

public sealed class ServerSettingCleanupHandler(INotificationRepository repo) : IEventHandler<MemberRemovedFromServer>, IEventHandler<ServerDeleted>
{
    public Task HandleAsync(MemberRemovedFromServer e, CancellationToken ct) => repo.DeleteServerSettingsAsync(e.ServerId, e.UserId, ct);
    public Task HandleAsync(ServerDeleted e, CancellationToken ct) => repo.DeleteServerSettingsAsync(e.ServerId, null, ct);
}
