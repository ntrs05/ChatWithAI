using Nebula.Shared.Kernel;

namespace Nebula.Notifications.Domain;

public enum NotificationType
{
    // TODO: giá trị lấy theo ERD
}

public enum NotifyLevel
{
    // TODO: giá trị lấy theo ERD
}

// TODO: CreateDefault, SetDoNotDisturb, SetMentionsOnly, ShouldNotify
public sealed class NotificationPreference
{
}

// TODO: Create, Update, IsMuted
public sealed class ConversationSetting
{
}

// TODO: Create, Update, IsMuted
public sealed class ServerSetting
{
}

// TODO: Create, MarkRead
public sealed class Notification : Entity
{
}
