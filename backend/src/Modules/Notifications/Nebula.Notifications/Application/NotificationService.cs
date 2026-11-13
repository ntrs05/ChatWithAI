namespace Nebula.Notifications.Application;

// TODO: các trường (bool DoNotDisturb, bool MentionsOnly)
public sealed record PreferenceDto
{
}

// TODO: request gồm (NotifyLevel Level, DateTime? MutedUntil)
public sealed record ConversationSettingRequest
{
}

// TODO: request gồm (NotifyLevel Level, DateTime? MutedUntil)
public sealed record ServerSettingRequest
{
}

// TODO: các trường (Guid ServerId, string Level, DateTime? MutedUntil)
public sealed record ServerSettingDto
{
}

// TODO: các trường (Guid ConversationId, string Level, DateTime? MutedUntil)
public sealed record ConversationSettingDto
{
}

// TODO: các trường (Guid Id, string DisplayName, string Username, string? AvatarUrl)
public sealed record NotificationActorDto
{
}

// TODO: các trường (Guid Id, string Type, string Title, string Body, string RefType, Guid RefId, Guid? ActorId, DateTime CreatedAt, bool IsRead, NotificationActorDto? Actor = null)
//       From
public sealed record NotificationDto
{
}

// TODO: GetPreferenceAsync, SetMentionsOnlyAsync, GetConversationSettingAsync
//       SetConversationSettingAsync, ResetConversationSettingAsync, ListServerSettingsAsync
//       SetServerSettingAsync, ResetServerSettingAsync, ListAsync, CountUnreadAsync
//       MarkReadAsync, MarkAllReadAsync
public sealed class NotificationService
{
}

// TODO: SendAsync
public sealed class Notifier
{
}
