using Nebula.Shared.Kernel;

namespace Nebula.Messaging.Domain;

/// <summary>Direct = chat 1-1. Channel = kênh nằm trong một server.</summary>
public enum ConversationType { Direct, Channel }
public enum ChannelKind { Text, Voice }

/// <summary>Category gom các kênh trong một server (VD: "Kênh chat", "Kênh thoại").</summary>
public sealed class Category : Entity
{
    private Category() { }
    public Guid ServerId { get; private set; }
    public string Name { get; private set; } = "";
    public int Position { get; private set; }

    public static Result<Category> Create(Guid serverId, string name, int position)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Length > 100) return new Error("Category.InvalidName", "Tên category phải từ 1 đến 100 ký tự.");
        return Result.Success(new Category { ServerId = serverId, Name = name.Trim(), Position = position });
    }
}

/// <summary>Hội thoại: nơi chứa tin nhắn. Gộp chat 1-1 và kênh server vào một bảng để gửi/sửa/ghim/tìm kiếm dùng chung code.
/// Ai được vào kênh server do module Organization quyết định (qua IOrganizationApi).</summary>
public sealed class Conversation : Entity
{
    private Conversation() { }
    public ConversationType Type { get; private set; }
    public Guid? ServerId { get; private set; }
    public Guid? CategoryId { get; private set; }
    public string? Name { get; private set; }
    public string? Topic { get; private set; }
    public ChannelKind? Kind { get; private set; }
    /// <summary>Chỉ dùng cho chat 1-1: "idNhỏ:idLớn", có chỉ mục UNIQUE để không bao giờ tạo trùng.</summary>
    public string? DirectKey { get; private set; }
    public int Position { get; private set; }
    public Guid CreatedBy { get; private set; }
    /// <summary>Kênh riêng tư: chỉ người có trong msg_channel_members (và chủ server) mới thấy và đọc được.</summary>
    public bool IsPrivate { get; private set; }

    public bool IsDirect => Type == ConversationType.Direct;

    public static Result<Conversation> CreateChannel(Guid serverId, Guid? categoryId, string name, ChannelKind kind, Guid createdBy, int position, bool isPrivate = false)
    {
        var c = new Conversation { Type = ConversationType.Channel, ServerId = serverId, CategoryId = categoryId, Kind = kind, CreatedBy = createdBy, Position = position, IsPrivate = isPrivate };
        var r = c.UpdateChannel(name, null);
        return r.IsFailure ? r.Error : Result.Success(c);
    }

    public static Conversation CreateDirect(Guid a, Guid b)
        => new() { Type = ConversationType.Direct, DirectKey = KeyFor(a, b), CreatedBy = a };

    public static string KeyFor(Guid a, Guid b)
        => string.CompareOrdinal(a.ToString(), b.ToString()) < 0 ? $"{a}:{b}" : $"{b}:{a}";

    /// <summary>Hai người trong chat 1-1.</summary>
    public IReadOnlyList<Guid> DirectParticipants() => DirectKey!.Split(':').Select(Guid.Parse).ToList();

    public Guid OtherParticipant(Guid userId) => DirectParticipants().First(id => id != userId);

    public void SetPrivate(bool isPrivate) => IsPrivate = isPrivate;

    public Result UpdateChannel(string name, string? topic)
    {
        if (IsDirect) return Result.Failure(new Error("Conversation.NotChannel", "Chỉ sửa được kênh."));
        if (string.IsNullOrWhiteSpace(name) || name.Length > 100) return Result.Failure(new Error("Channel.InvalidName", "Tên kênh phải từ 1 đến 100 ký tự."));
        if (topic?.Length > 300) return Result.Failure(new Error("Channel.InvalidTopic", "Chủ đề kênh tối đa 300 ký tự."));
        Name = name.Trim();
        Topic = topic?.Trim();
        return Result.Success();
    }
}

/// <summary>Trạng thái riêng của một người trong một hội thoại: đọc tới đâu, có ẩn không, đã xóa phía mình chưa.</summary>
public sealed class ConversationMember
{
    private ConversationMember() { }
    public Guid ConversationId { get; private set; }
    public Guid UserId { get; private set; }
    public DateTime JoinedAt { get; private set; } = DateTime.UtcNow;
    public DateTime? LastReadAt { get; private set; }
    public bool IsArchived { get; private set; }
    /// <summary>Xóa cuộc trò chuyện CHỈ phía mình: tin trước mốc này không còn hiện với người này.</summary>
    public DateTime? ClearedAt { get; private set; }

    public static ConversationMember Create(Guid conversationId, Guid userId) => new() { ConversationId = conversationId, UserId = userId };
    public void MarkRead() => LastReadAt = DateTime.UtcNow;
    public void SetArchived(bool archived) => IsArchived = archived;
    public void Clear() { ClearedAt = DateTime.UtcNow; LastReadAt = ClearedAt; IsArchived = false; }
}

/// <summary>Người được phép vào một kênh riêng tư. Kênh công khai không có dòng nào ở đây.</summary>
public sealed class ChannelMember
{
    private ChannelMember() { }
    public Guid ConversationId { get; private set; }
    public Guid UserId { get; private set; }
    public DateTime AddedAt { get; private set; } = DateTime.UtcNow;

    public static ChannelMember Create(Guid conversationId, Guid userId) => new() { ConversationId = conversationId, UserId = userId };
}
