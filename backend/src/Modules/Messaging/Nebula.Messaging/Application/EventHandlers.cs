using Nebula.Messaging.Domain;
using Nebula.Shared.Contracts;

namespace Nebula.Messaging.Application;

/// <summary>Đẩy tin mới tới màn hình những người trong hội thoại (kể cả người gửi để đồng bộ nhiều thiết bị).</summary>
public sealed class PushMessageHandler(IRealtimeGateway gateway, IMessageRepository messages, MessageDtoFactory factory) : IEventHandler<MessageSent>
{
    public async Task HandleAsync(MessageSent e, CancellationToken ct)
    {
        // Gửi kèm cả tin nhắn đầy đủ (người gửi, file đính kèm) để client hiển thị luôn, không phải gọi API lấy lại.
        var message = await messages.GetAsync(e.MessageId, ct);
        var dto = message is null ? null : await factory.ToDtoAsync(message, false, ct);
        await gateway.PushToUsersAsync(e.RecipientIds.Append(e.SenderId), "MessageReceived",
            new { e.MessageId, e.ConversationId, e.ServerId, e.SenderId, e.Content, e.SentAt, e.IsDirect, e.MentionedUserIds, Message = dto }, ct);
    }
}

/// <summary>Sửa / xóa / ghim / reaction: báo cho mọi người trong hội thoại để giao diện cập nhật ngay.</summary>
public sealed class PushMessageChangedHandler(IRealtimeGateway gateway, IMessageRepository messages, MessageDtoFactory factory) : IEventHandler<MessageChanged>
{
    public async Task HandleAsync(MessageChanged e, CancellationToken ct)
    {
        // Gửi kèm tin đã cập nhật (nội dung mới / đã xóa / reaction / ghim) để client vẽ lại ngay, không phải gọi API lấy lại.
        var message = await messages.GetAsync(e.MessageId, ct);
        MessageDto? dto = null;
        if (message is not null)
        {
            var pinned = await messages.GetPinAsync(message.ConversationId, message.Id, ct) is not null;
            dto = await factory.ToDtoAsync(message, pinned, ct);
        }
        await gateway.PushToUsersAsync(e.ParticipantIds, "MessageChanged", new { e.MessageId, e.ConversationId, e.Change, Message = dto }, ct);
    }
}

/// <summary>Đổi tên / ảnh đại diện → báo cho mọi người đang online (nhỏ, vài chục byte).</summary>
public sealed class PushProfileHandler(IRealtimeGateway gateway) : IEventHandler<UserProfileChanged>
{
    public Task HandleAsync(UserProfileChanged e, CancellationToken ct)
        => gateway.PushToAllAsync("ProfileChanged", new { e.UserId, e.DisplayName, e.Username, e.AvatarUrl }, ct);
}

public sealed class PushStatusHandler(IRealtimeGateway gateway) : IEventHandler<UserStatusChanged>
{
    public Task HandleAsync(UserStatusChanged e, CancellationToken ct)
        => gateway.PushToAllAsync("StatusChanged", new { e.UserId, e.Status }, ct);
}

/// <summary>Organization vừa tạo server → Messaging tự tạo kênh mặc định. Organization không hề biết "kênh" là gì.</summary>
public sealed class ServerCreatedHandler(ChannelService channels) : IEventHandler<ServerCreated>
{
    public Task HandleAsync(ServerCreated e, CancellationToken ct) => channels.CreateDefaultChannelsAsync(e.ServerId, e.OwnerId, ct);
}

/// <summary>Server bị xóa → xóa kênh, category, tin nhắn của server và báo cho các thành viên.</summary>
public sealed class ServerDeletedHandler(IConversationRepository conversations, IRealtimeGateway gateway) : IEventHandler<ServerDeleted>
{
    public async Task HandleAsync(ServerDeleted e, CancellationToken ct)
    {
        await conversations.DeleteServerDataAsync(e.ServerId, ct);
        await gateway.PushToUsersAsync(e.MemberIds, "ServerDeleted", new { e.ServerId }, ct);
    }
}

/// <summary>Được thêm / bị xóa khỏi server → báo realtime để giao diện cập nhật danh sách server.</summary>
public sealed class ServerMembershipRealtimeHandler(IRealtimeGateway gateway, IOrganizationApi organization, IIdentityApi identity)
    : IEventHandler<MemberAddedToServer>, IEventHandler<MemberRemovedFromServer>
{
    public async Task HandleAsync(MemberAddedToServer e, CancellationToken ct)
    {
        await gateway.PushToUsersAsync([e.UserId], "AddedToServer", new { e.ServerId, e.ServerName }, ct);

        // Những người đang ở trong server thấy thành viên mới xuất hiện ngay trong danh sách.
        var user = await identity.GetUserAsync(e.UserId, ct);
        if (user is null) return;
        var role = (await organization.GetAccessAsync(e.ServerId, e.UserId, ct)).Role ?? "Member";
        var members = await organization.GetMemberIdsAsync(e.ServerId, ct);
        await gateway.PushToUsersAsync(members.Where(id => id != e.UserId), "MemberJoined", new
        {
            member = new { serverId = e.ServerId, userId = e.UserId, displayName = user.DisplayName, username = user.Username,
                           avatarUrl = user.AvatarUrl, status = user.Status, role, joinedAt = DateTime.UtcNow }
        }, ct);
    }

    public async Task HandleAsync(MemberRemovedFromServer e, CancellationToken ct)
    {
        await gateway.PushToUsersAsync([e.UserId], "RemovedFromServer", new { e.ServerId, e.ServerName, e.Reason }, ct);
        await gateway.PushToUsersAsync(await organization.GetMemberIdsAsync(e.ServerId, ct), "MemberLeft", new { serverId = e.ServerId, userId = e.UserId }, ct);
    }
}

/// <summary>Có kênh mới → mọi thành viên của server thấy ngay trong thanh bên.</summary>
public sealed class ChannelCreatedRealtimeHandler(IRealtimeGateway gateway, IConversationRepository conversations) : IEventHandler<ChannelCreated>
{
    public async Task HandleAsync(ChannelCreated e, CancellationToken ct)
    {
        var channel = await conversations.GetAsync(e.ChannelId, ct);
        if (channel is not null) await gateway.PushToUsersAsync(e.MemberIds, "ChannelCreated", new { channel = ChannelDto.From(channel) }, ct);
    }
}

/// <summary>Người dùng không còn thấy kênh nữa (bị bỏ khỏi kênh riêng tư) → báo để thanh bên ẩn kênh đi.</summary>
public sealed class ChannelRemovedRealtimeHandler(IRealtimeGateway gateway) : IEventHandler<ChannelRemoved>
{
    public Task HandleAsync(ChannelRemoved e, CancellationToken ct)
        => gateway.PushToUsersAsync(e.UserIds, "ChannelRemoved", new { e.ChannelId, e.ServerId }, ct);
}

/// <summary>Server đổi chủ → chủ mới được thêm vào mọi kênh riêng tư, để vẫn nhận tin realtime ở các kênh đó.</summary>
public sealed class OwnerPrivateChannelsHandler(IConversationRepository conversations, IMessagingUnitOfWork uow) : IEventHandler<MemberRoleChanged>
{
    public async Task HandleAsync(MemberRoleChanged e, CancellationToken ct)
    {
        if (e.NewRole != "Owner") return;
        var privateIds = (await conversations.ListChannelsAsync(e.ServerId, ct)).Where(c => c.IsPrivate).Select(c => c.Id).ToList();
        if (privateIds.Count == 0) return;
        var already = (await conversations.ListChannelMembersAsync(privateIds, ct)).Where(m => m.UserId == e.UserId).Select(m => m.ConversationId).ToHashSet();
        foreach (var id in privateIds.Where(id => !already.Contains(id)))
            await conversations.AddChannelMemberAsync(ChannelMember.Create(id, e.UserId), ct);
        await uow.SaveChangesAsync(ct);
    }
}

/// <summary>Mất kết nối cuối cùng / bị xóa khỏi server / server bị xóa → dọn trạng thái kênh thoại, báo mọi người.</summary>
public sealed class VoiceCleanupHandler(VoiceService voice)
    : IEventHandler<UserDisconnected>, IEventHandler<MemberRemovedFromServer>, IEventHandler<ServerDeleted>
{
    public Task HandleAsync(UserDisconnected e, CancellationToken ct) => voice.RemoveAsync(r => r.UserId == e.UserId, ct);
    public Task HandleAsync(MemberRemovedFromServer e, CancellationToken ct) => voice.RemoveAsync(r => r.ServerId == e.ServerId && r.UserId == e.UserId, ct);
    public Task HandleAsync(ServerDeleted e, CancellationToken ct) => voice.RemoveAsync(r => r.ServerId == e.ServerId, ct);
}

/// <summary>Admin hệ thống khóa tài khoản → ngắt kết nối realtime của người đó ngay.</summary>
public sealed class UserLockedHandler(IRealtimeGateway gateway) : IEventHandler<UserLocked>
{
    public Task HandleAsync(UserLocked e, CancellationToken ct) => gateway.DisconnectUserAsync(e.UserId, ct);
}
