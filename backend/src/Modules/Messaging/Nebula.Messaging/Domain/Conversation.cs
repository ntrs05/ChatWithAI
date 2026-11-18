using Nebula.Shared.Kernel;

namespace Nebula.Messaging.Domain;

public enum ConversationType { Direct, Channel }
public enum ChannelKind { Text, Voice }

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

public sealed class Conversation : Entity
{
    private Conversation() { }
    public ConversationType Type { get; private set; }
    public Guid? ServerId { get; private set; }
    public Guid? CategoryId { get; private set; }
    public string? Name { get; private set; }
    public string? Topic { get; private set; }
    public ChannelKind? Kind { get; private set; }
    public string? DirectKey { get; private set; }
    public int Position { get; private set; }
    public Guid CreatedBy { get; private set; }
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

public sealed class ConversationMember
{
    private ConversationMember() { }
    public Guid ConversationId { get; private set; }
    public Guid UserId { get; private set; }
    public DateTime JoinedAt { get; private set; } = DateTime.UtcNow;
    public DateTime? LastReadAt { get; private set; }
    public bool IsArchived { get; private set; }
    public DateTime? ClearedAt { get; private set; }

    public static ConversationMember Create(Guid conversationId, Guid userId) => new() { ConversationId = conversationId, UserId = userId };
    public void MarkRead() => LastReadAt = DateTime.UtcNow;
    public void SetArchived(bool archived) => IsArchived = archived;
    public void Clear() { ClearedAt = DateTime.UtcNow; LastReadAt = ClearedAt; IsArchived = false; }
}

public sealed class ChannelMember
{
    private ChannelMember() { }
    public Guid ConversationId { get; private set; }
    public Guid UserId { get; private set; }
    public DateTime AddedAt { get; private set; } = DateTime.UtcNow;

    public static ChannelMember Create(Guid conversationId, Guid userId) => new() { ConversationId = conversationId, UserId = userId };
}
