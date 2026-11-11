namespace Nebula.Shared.Contracts;

/// <summary>Một tin nhắn rút gọn dành cho module khác đọc (VD: Ai tóm tắt).</summary>
public sealed record ChatLine(string Author, string Content, DateTime CreatedAt, int AttachmentCount);

/// <param name="Exists">Có hội thoại này không.</param>
/// <param name="CanRead">Người hỏi có quyền đọc không.</param>
/// <param name="IsTextChat">Là kênh chữ hoặc chat 1-1 (kênh thoại thì không có tin để đọc).</param>
/// <param name="Lines">Tin gần nhất, xếp cũ → mới.</param>
public sealed record RecentChat(bool Exists, bool CanRead, bool IsTextChat, IReadOnlyList<ChatLine> Lines)
{
    public static readonly RecentChat Missing = new(false, false, false, []);
}

/// <summary>Bot Nebula: không phải tài khoản trong bảng người dùng, chỉ là một danh tính cố định để hiển thị làm người gửi.</summary>
public static class BotIdentity
{
    public static readonly Guid Id = new("00000000-0000-0000-0000-00000000be70");
    public const string DisplayName = "Nebula";
    public const string Username = "nebula";
}

/// <summary>Cổng để module khác HỎI Messaging. Quyền đọc vẫn do Messaging quyết định, nơi gọi không tự kiểm tra.</summary>
public interface IMessagingApi
{
    /// <param name="since">Chỉ lấy tin sau mốc này (UTC); null = không giới hạn thời gian.</param>
    Task<RecentChat> GetRecentChatAsync(Guid userId, Guid conversationId, int limit, DateTime? since = null, CancellationToken ct = default);

    /// <summary>Bot Nebula đăng một tin vào kênh server. <paramref name="requesterId"/> là người đã gọi bot, phải đọc được kênh.
    /// Trả false nếu kênh không tồn tại, là chat 1-1 hoặc người gọi không có quyền.</summary>
    Task<bool> PostAsBotAsync(Guid requesterId, Guid conversationId, string content, Guid? replyToId = null, CancellationToken ct = default);
}
