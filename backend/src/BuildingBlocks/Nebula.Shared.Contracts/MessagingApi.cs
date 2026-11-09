namespace Nebula.Shared.Contracts;

public sealed record ChatLine(string Author, string Content, DateTime CreatedAt, int AttachmentCount);

public sealed record RecentChat(bool Exists, bool CanRead, bool IsTextChat, IReadOnlyList<ChatLine> Lines)
{
    public static readonly RecentChat Missing = new(false, false, false, []);
}

public static class BotIdentity
{
    public static readonly Guid Id = new("00000000-0000-0000-0000-00000000be70");
    public const string DisplayName = "Nebula";
    public const string Username = "nebula";
}

public interface IMessagingApi
{
    Task<RecentChat> GetRecentChatAsync(Guid userId, Guid conversationId, int limit, DateTime? since = null, CancellationToken ct = default);

    Task<bool> PostAsBotAsync(Guid requesterId, Guid conversationId, string content, Guid? replyToId = null, CancellationToken ct = default);
}
