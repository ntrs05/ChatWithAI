using Nebula.Notifications.Domain;
using Nebula.Shared.Contracts;
using Nebula.Shared.Kernel;

namespace Nebula.Notifications.Application;

public sealed record PreferenceDto(bool DoNotDisturb, bool MentionsOnly);
public sealed record ConversationSettingRequest(NotifyLevel Level, DateTime? MutedUntil);
public sealed record ServerSettingRequest(NotifyLevel Level, DateTime? MutedUntil);
public sealed record ServerSettingDto(Guid ServerId, string Level, DateTime? MutedUntil);
public sealed record ConversationSettingDto(Guid ConversationId, string Level, DateTime? MutedUntil);
/// <summary>Người gây ra thông báo (người mời, người nhắc tên…), để giao diện hiển thị tên + ảnh luôn.</summary>
public sealed record NotificationActorDto(Guid Id, string DisplayName, string Username, string? AvatarUrl);

public sealed record NotificationDto(Guid Id, string Type, string Title, string Body, string RefType, Guid RefId, Guid? ActorId, DateTime CreatedAt, bool IsRead, NotificationActorDto? Actor = null)
{
    public static NotificationDto From(Notification n, IReadOnlyDictionary<Guid, UserSummary>? users = null)
        => new(n.Id, n.Type.ToString(), n.Title, n.Body, n.RefType, n.RefId, n.ActorId, n.CreatedAt, n.IsRead,
            n.ActorId is Guid a && users is not null && users.TryGetValue(a, out var u) ? new NotificationActorDto(u.Id, u.DisplayName, u.Username, u.AvatarUrl) : null);
}

public sealed class NotificationService(INotificationRepository repo, INotificationsUnitOfWork uow, IOrganizationApi organization, IIdentityApi identity)
{
    // ---- Cài đặt chung ----
    public async Task<PreferenceDto> GetPreferenceAsync(Guid userId, CancellationToken ct)
    {
        var p = await repo.GetPreferenceAsync(userId, ct);
        return new PreferenceDto(p?.DoNotDisturb ?? false, p?.MentionsOnly ?? false);
    }

    public async Task SetMentionsOnlyAsync(Guid userId, bool value, CancellationToken ct)
    {
        var p = await repo.GetPreferenceAsync(userId, ct);
        if (p is null) { p = NotificationPreference.CreateDefault(userId); await repo.AddPreferenceAsync(p, ct); }
        p.SetMentionsOnly(value);
        await uow.SaveChangesAsync(ct);
    }

    // ---- Cài đặt riêng từng hội thoại (mức thông báo, tạm tắt tiếng) ----
    public async Task<ConversationSettingDto> GetConversationSettingAsync(Guid userId, Guid conversationId, CancellationToken ct)
    {
        var s = await repo.GetSettingAsync(userId, conversationId, ct);
        return new ConversationSettingDto(conversationId, (s?.Level ?? NotifyLevel.All).ToString(), s?.MutedUntil);
    }

    public async Task SetConversationSettingAsync(Guid userId, Guid conversationId, ConversationSettingRequest req, CancellationToken ct)
    {
        var s = await repo.GetSettingAsync(userId, conversationId, ct);
        if (s is null) { s = ConversationSetting.Create(userId, conversationId); await repo.AddSettingAsync(s, ct); }
        s.Update(req.Level, req.MutedUntil);
        await uow.SaveChangesAsync(ct);
    }

    public async Task ResetConversationSettingAsync(Guid userId, Guid conversationId, CancellationToken ct)
    {
        var s = await repo.GetSettingAsync(userId, conversationId, ct);
        if (s is null) return;
        repo.RemoveSetting(s);
        await uow.SaveChangesAsync(ct);
    }

    // ---- Cài đặt cho CẢ SERVER (server) ----
    public async Task<IReadOnlyList<ServerSettingDto>> ListServerSettingsAsync(Guid userId, CancellationToken ct)
        => (await repo.ListServerSettingsAsync(userId, ct)).Select(g => new ServerSettingDto(g.ServerId, g.Level.ToString(), g.MutedUntil)).ToList();

    public async Task<Result<ServerSettingDto>> SetServerSettingAsync(Guid userId, Guid serverId, ServerSettingRequest req, CancellationToken ct)
    {
        // Chỉ thành viên mới có cài đặt thông báo cho server đó.
        var access = await organization.GetAccessAsync(serverId, userId, ct);
        if (!access.Exists) return Error.NotFound("Server.NotFound", "Không tìm thấy server.");
        if (access.Role is null) return Error.Forbidden("Server.NoAccess", "Bạn không thuộc server này.");

        var s = await repo.GetServerSettingAsync(userId, serverId, ct);
        if (s is null) { s = ServerSetting.Create(userId, serverId); await repo.AddServerSettingAsync(s, ct); }
        s.Update(req.Level, req.MutedUntil);
        await uow.SaveChangesAsync(ct);
        return Result.Success(new ServerSettingDto(serverId, s.Level.ToString(), s.MutedUntil));
    }

    public async Task ResetServerSettingAsync(Guid userId, Guid serverId, CancellationToken ct)
    {
        var s = await repo.GetServerSettingAsync(userId, serverId, ct);
        if (s is null) return;
        repo.RemoveServerSetting(s);
        await uow.SaveChangesAsync(ct);
    }

    // ---- Hộp thư thông báo ----
    public async Task<IReadOnlyList<NotificationDto>> ListAsync(Guid userId, bool unreadOnly, int skip, int take, CancellationToken ct)
    {
        var items = await repo.ListNotificationsAsync(userId, unreadOnly, Math.Max(0, skip), Math.Clamp(take, 1, 100), ct);
        var actors = await identity.GetUsersAsync(items.Where(n => n.ActorId is not null).Select(n => n.ActorId!.Value).Distinct().ToList(), ct);
        return items.Select(n => NotificationDto.From(n, actors)).ToList();
    }

    public Task<int> CountUnreadAsync(Guid userId, CancellationToken ct) => repo.CountUnreadAsync(userId, ct);

    public async Task<Result> MarkReadAsync(Guid userId, Guid notificationId, CancellationToken ct)
    {
        var n = await repo.GetNotificationAsync(notificationId, ct);
        if (n is null || n.UserId != userId) return Result.Failure(Error.NotFound("Notification.NotFound", "Không tìm thấy thông báo."));
        n.MarkRead();
        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }

    public Task MarkAllReadAsync(Guid userId, CancellationToken ct) => repo.MarkAllReadAsync(userId, ct);
}

/// <summary>Lưu thông báo vào hộp thư rồi đẩy realtime. Người đang "không làm phiền" chỉ được lưu, không bật lên màn hình.</summary>
public sealed class Notifier(INotificationRepository repo, INotificationsUnitOfWork uow, IRealtimeGateway realtime, IIdentityApi identity)
{
    public async Task SendAsync(IReadOnlyList<Notification> items, CancellationToken ct)
    {
        if (items.Count == 0) return;
        await repo.AddNotificationsAsync(items, ct);
        await uow.SaveChangesAsync(ct);

        var dnd = (await repo.GetPreferencesAsync(items.Select(i => i.UserId), ct)).Where(p => p.DoNotDisturb).Select(p => p.UserId).ToHashSet();
        var actors = await identity.GetUsersAsync(items.Where(i => i.ActorId is not null).Select(i => i.ActorId!.Value).Distinct().ToList(), ct);
        foreach (var item in items.Where(i => !dnd.Contains(i.UserId)))
            await realtime.PushToUsersAsync([item.UserId], "NotificationReceived", NotificationDto.From(item, actors), ct);
    }
}
