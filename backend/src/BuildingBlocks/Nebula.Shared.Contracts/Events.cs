namespace Nebula.Shared.Contracts;

// ActorId = người thực hiện, để Audit ghi log.

public sealed record UserRegistered(Guid UserId, string Email, string DisplayName) : IntegrationEvent;
public sealed record UserLocked(Guid UserId, Guid ActorId, string Reason) : IntegrationEvent;
public sealed record UserUnlocked(Guid UserId, Guid ActorId) : IntegrationEvent;
public sealed record UserStatusChanged(Guid UserId, string Status) : IntegrationEvent;

public sealed record ServerCreated(Guid ServerId, string Name, Guid OwnerId, Guid ActorId) : IntegrationEvent;
public sealed record ServerDeleted(Guid ServerId, string Name, IReadOnlyList<Guid> MemberIds, Guid ActorId) : IntegrationEvent;
public sealed record MemberAddedToServer(Guid ServerId, string ServerName, Guid UserId, Guid ActorId) : IntegrationEvent;
public sealed record MemberRemovedFromServer(Guid ServerId, string ServerName, Guid UserId, string Reason, Guid ActorId) : IntegrationEvent;
public sealed record MemberRoleChanged(Guid ServerId, string ServerName, Guid UserId, string NewRole, Guid ActorId) : IntegrationEvent;
public sealed record JoinRequestCreated(Guid RequestId, Guid ServerId, string ServerName, Guid UserId, string Type, IReadOnlyList<Guid> NotifyUserIds, Guid ActorId) : IntegrationEvent;
public sealed record SystemSettingChanged(string Key, string Value, Guid ActorId) : IntegrationEvent;

public sealed record MessageSent(
    Guid MessageId, Guid ConversationId, Guid? ServerId, Guid SenderId,
    string Content, DateTime SentAt, bool IsDirect,
    IReadOnlyList<Guid> RecipientIds,   // trừ người gửi
    IReadOnlyList<Guid> MentionedUserIds) : IntegrationEvent;

public sealed record MessageChanged(Guid MessageId, Guid ConversationId, string Change, IReadOnlyList<Guid> ParticipantIds) : IntegrationEvent;

public sealed record UserConnected(Guid UserId) : IntegrationEvent;
public sealed record UserDisconnected(Guid UserId) : IntegrationEvent;

public sealed record StorageQuotaChanged(Guid UserId, long QuotaBytes, Guid ActorId) : IntegrationEvent;

public sealed record ChannelCreated(Guid ChannelId, Guid ServerId, IReadOnlyList<Guid> MemberIds) : IntegrationEvent;

public sealed record ChannelRemoved(Guid ChannelId, Guid ServerId, IReadOnlyList<Guid> UserIds) : IntegrationEvent;

public sealed record FriendRequestSent(Guid RequestId, Guid RequesterId, Guid AddresseeId) : IntegrationEvent;
public sealed record FriendRequestAccepted(Guid RequestId, Guid RequesterId, Guid AddresseeId) : IntegrationEvent;
public sealed record FriendshipEnded(Guid ActorId, Guid OtherId, string Reason) : IntegrationEvent;

public sealed record UserProfileChanged(Guid UserId, string DisplayName, string Username, string? AvatarUrl) : IntegrationEvent;
