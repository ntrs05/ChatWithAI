namespace Nebula.Shared.Contracts;

// Mọi event đều có ActorId = người thực hiện hành động, để module Audit ghi nhật ký "ai làm gì".

// ===== Identity phát ra =====
public sealed record UserRegistered(Guid UserId, string Email, string DisplayName) : IntegrationEvent;
public sealed record UserLocked(Guid UserId, Guid ActorId, string Reason) : IntegrationEvent;
public sealed record UserUnlocked(Guid UserId, Guid ActorId) : IntegrationEvent;
public sealed record UserStatusChanged(Guid UserId, string Status) : IntegrationEvent;

// ===== Organization phát ra =====
public sealed record ServerCreated(Guid ServerId, string Name, Guid OwnerId, Guid ActorId) : IntegrationEvent;
public sealed record ServerDeleted(Guid ServerId, string Name, IReadOnlyList<Guid> MemberIds, Guid ActorId) : IntegrationEvent;
public sealed record MemberAddedToServer(Guid ServerId, string ServerName, Guid UserId, Guid ActorId) : IntegrationEvent;
/// <summary>Reason: Kicked (bị xóa), Banned (bị cấm), Left (tự rời).</summary>
public sealed record MemberRemovedFromServer(Guid ServerId, string ServerName, Guid UserId, string Reason, Guid ActorId) : IntegrationEvent;
public sealed record MemberRoleChanged(Guid ServerId, string ServerName, Guid UserId, string NewRole, Guid ActorId) : IntegrationEvent;
/// <summary>Type: Invite (được mời, NotifyUserIds = người được mời) hoặc Request (xin vào, NotifyUserIds = chủ server/quản trị viên).</summary>
public sealed record JoinRequestCreated(Guid RequestId, Guid ServerId, string ServerName, Guid UserId, string Type, IReadOnlyList<Guid> NotifyUserIds, Guid ActorId) : IntegrationEvent;
public sealed record SystemSettingChanged(string Key, string Value, Guid ActorId) : IntegrationEvent;

// ===== Messaging phát ra =====
public sealed record MessageSent(
    Guid MessageId, Guid ConversationId, Guid? ServerId, Guid SenderId,
    string Content, DateTime SentAt, bool IsDirect,
    IReadOnlyList<Guid> RecipientIds,       // mọi người trong hội thoại, trừ người gửi
    IReadOnlyList<Guid> MentionedUserIds) : IntegrationEvent;

/// <summary>Tin nhắn bị sửa / xóa / ghim / đổi reaction. Client nhận rồi tải lại tin đó.</summary>
public sealed record MessageChanged(Guid MessageId, Guid ConversationId, string Change, IReadOnlyList<Guid> ParticipantIds) : IntegrationEvent;

/// <summary>Phát khi người dùng mở kết nối realtime đầu tiên / đóng kết nối cuối cùng.</summary>
public sealed record UserConnected(Guid UserId) : IntegrationEvent;
public sealed record UserDisconnected(Guid UserId) : IntegrationEvent;

// ===== Media phát ra =====
public sealed record StorageQuotaChanged(Guid UserId, long QuotaBytes, Guid ActorId) : IntegrationEvent;

/// <summary>Messaging phát ra khi có kênh mới trong server. MemberIds = những người cần cập nhật danh sách kênh.</summary>
public sealed record ChannelCreated(Guid ChannelId, Guid ServerId, IReadOnlyList<Guid> MemberIds) : IntegrationEvent;

/// <summary>Người dùng bị bỏ khỏi kênh riêng tư (hoặc kênh chuyển sang riêng tư): giao diện của họ ẩn kênh này đi.</summary>
public sealed record ChannelRemoved(Guid ChannelId, Guid ServerId, IReadOnlyList<Guid> UserIds) : IntegrationEvent;

// ===== Friends phát ra =====
/// <summary>Có lời mời kết bạn mới (RequesterId gửi cho AddresseeId).</summary>
public sealed record FriendRequestSent(Guid RequestId, Guid RequesterId, Guid AddresseeId) : IntegrationEvent;
/// <summary>Lời mời được chấp nhận (hoặc hai bên cùng gửi cho nhau nên tự thành bạn).</summary>
public sealed record FriendRequestAccepted(Guid RequestId, Guid RequesterId, Guid AddresseeId) : IntegrationEvent;
/// <summary>Kết thúc quan hệ: từ chối / hủy lời mời / hủy kết bạn. ActorId = người thực hiện, OtherId = người còn lại.</summary>
public sealed record FriendshipEnded(Guid ActorId, Guid OtherId, string Reason) : IntegrationEvent;

/// <summary>Identity phát ra khi người dùng đổi tên / ảnh đại diện. Messaging đẩy realtime để mọi người thấy tên mới ngay.</summary>
public sealed record UserProfileChanged(Guid UserId, string DisplayName, string Username, string? AvatarUrl) : IntegrationEvent;
