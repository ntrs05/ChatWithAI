using Nebula.Shared.Kernel;

namespace Nebula.Notifications.Domain;

public enum NotificationType { Mention, DirectMessage, AddedToServer, RemovedFromServer, RoleChanged, JoinRequest, ServerOwner, FriendRequest, FriendAccepted }

/// <summary>Mức thông báo của một hội thoại: tất cả tin / chỉ khi được nhắc / không bao giờ.</summary>
public enum NotifyLevel { All, MentionsOnly, Nothing }

/// <summary>Cài đặt thông báo chung của một người (khóa chính = UserId).
/// Cờ "không làm phiền" được CHÉP từ Identity qua event, để không phải hỏi Identity mỗi lần có tin nhắn.</summary>
public sealed class NotificationPreference
{
    private NotificationPreference() { }
    public Guid UserId { get; private set; }
    public bool DoNotDisturb { get; private set; }
    /// <summary>Bật thì tin trong kênh server chỉ báo khi được tag (tin 1-1 vẫn báo).</summary>
    public bool MentionsOnly { get; private set; }

    public static NotificationPreference CreateDefault(Guid userId) => new() { UserId = userId };
    public void SetDoNotDisturb(bool value) => DoNotDisturb = value;
    public void SetMentionsOnly(bool value) => MentionsOnly = value;

    /// <summary>Có báo tin nhắn này cho người này không? Gom mọi luật vào một chỗ để dễ test và dễ giải thích.</summary>
    public bool ShouldNotify(bool isMentioned, bool isDirect, ConversationSetting? setting, DateTime nowUtc, ServerSetting? serverSetting = null)
    {
        // Cài đặt của CẢ SERVER (chuột phải vào server): áp trước cài đặt của từng kênh.
        if (serverSetting?.Level == NotifyLevel.Nothing) return false;                    // tắt thông báo cả server
        if (serverSetting?.IsMuted(nowUtc) == true && !isMentioned) return false;         // đang tắt âm server, trừ khi được tag
        if (serverSetting?.Level == NotifyLevel.MentionsOnly && !isMentioned) return false;
        if (setting?.Level == NotifyLevel.Nothing) return false;                         // tắt hẳn hội thoại này
        if (setting?.IsMuted(nowUtc) == true && !isMentioned) return false;              // đang tạm tắt tiếng, trừ khi được tag
        if (setting?.Level == NotifyLevel.MentionsOnly && !isMentioned) return false;     // hội thoại này chỉ báo khi được tag
        if (MentionsOnly && !isMentioned && !isDirect) return false;                     // cài đặt chung: kênh server chỉ báo khi được tag
        return true;
    }
}

/// <summary>Cài đặt thông báo riêng cho một hội thoại. Khóa chính (UserId, ConversationId).</summary>
public sealed class ConversationSetting
{
    private ConversationSetting() { }
    public Guid UserId { get; private set; }
    public Guid ConversationId { get; private set; }
    public NotifyLevel Level { get; private set; } = NotifyLevel.All;
    /// <summary>Tạm tắt tiếng tới thời điểm này (null = không tắt tiếng).</summary>
    public DateTime? MutedUntil { get; private set; }

    public static ConversationSetting Create(Guid userId, Guid conversationId) => new() { UserId = userId, ConversationId = conversationId };
    public void Update(NotifyLevel level, DateTime? mutedUntil) { Level = level; MutedUntil = mutedUntil; }
    public bool IsMuted(DateTime nowUtc) => MutedUntil > nowUtc;
}

/// <summary>Cài đặt thông báo cho CẢ MỘT SERVER (server) của một người: mức thông báo + tạm tắt âm. Khóa chính (UserId, ServerId).
/// Giống "Tắt âm máy chủ" / "Cài đặt thông báo" khi bấm chuột phải vào server ở Discord.</summary>
public sealed class ServerSetting
{
    private ServerSetting() { }
    public Guid UserId { get; private set; }
    public Guid ServerId { get; private set; }
    public NotifyLevel Level { get; private set; } = NotifyLevel.All;
    /// <summary>Tắt âm tới thời điểm này (null = không tắt; DateTime.MaxValue = tắt cho tới khi bật lại).</summary>
    public DateTime? MutedUntil { get; private set; }

    public static ServerSetting Create(Guid userId, Guid serverId) => new() { UserId = userId, ServerId = serverId };
    public void Update(NotifyLevel level, DateTime? mutedUntil) { Level = level; MutedUntil = mutedUntil; }
    public bool IsMuted(DateTime nowUtc) => MutedUntil > nowUtc;
}

/// <summary>Một mục trong hộp thư thông báo.</summary>
/// <remarks>RefType + RefId cho biết bấm vào thông báo thì mở cái gì: "Conversation", "Server" hoặc "JoinRequest".</remarks>
public sealed class Notification : Entity
{
    private Notification() { }
    public Guid UserId { get; private set; }
    public NotificationType Type { get; private set; }
    public string Title { get; private set; } = "";
    public string Body { get; private set; } = "";
    public string RefType { get; private set; } = "";
    public Guid RefId { get; private set; }
    public Guid? ActorId { get; private set; }
    public DateTime? ReadAt { get; private set; }
    public bool IsRead => ReadAt is not null;

    public static Notification Create(Guid userId, NotificationType type, string title, string body, string refType, Guid refId, Guid? actorId)
        => new() { UserId = userId, Type = type, Title = title, Body = body.Length > 200 ? body[..199] + "…" : body, RefType = refType, RefId = refId, ActorId = actorId };

    public void MarkRead() => ReadAt ??= DateTime.UtcNow;
}
