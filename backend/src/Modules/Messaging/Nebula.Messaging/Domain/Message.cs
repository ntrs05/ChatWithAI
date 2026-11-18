using Nebula.Shared.Kernel;

namespace Nebula.Messaging.Domain;

public sealed class Message : Entity
{
    public const int MaxLength = 4000;
    public const int MaxAttachments = 10;

    private Message() { }
    private readonly List<MessageMention> _mentions = [];
    private readonly List<MessageReaction> _reactions = [];
    private readonly List<MessageAttachment> _attachments = [];

    public Guid ConversationId { get; private set; }
    public Guid SenderId { get; private set; }
    public string Content { get; private set; } = "";
    public Guid? ReplyToId { get; private set; }
    public DateTime? EditedAt { get; private set; }
    public DateTime? DeletedAt { get; private set; }
    public Guid? DeletedBy { get; private set; }
    public bool IsDeleted => DeletedAt is not null;
    public IReadOnlyCollection<MessageMention> Mentions => _mentions;
    public IReadOnlyCollection<MessageReaction> Reactions => _reactions;
    public IReadOnlyCollection<MessageAttachment> Attachments => _attachments;

    public static Result<Message> Create(Guid conversationId, Guid senderId, string content,
        IEnumerable<Guid> mentionedUserIds, IEnumerable<MessageAttachment>? attachments = null, Guid? replyToId = null)
    {
        content = content?.Trim() ?? "";
        var files = attachments?.ToList() ?? [];
        if (content.Length == 0 && files.Count == 0) return new Error("Message.Empty", "Tin nhắn không được để trống.");
        if (content.Length > MaxLength) return new Error("Message.TooLong", $"Tin nhắn tối đa {MaxLength} ký tự.");
        if (files.Count > MaxAttachments) return new Error("Message.TooManyFiles", $"Tối đa {MaxAttachments} file mỗi tin nhắn.");

        var m = new Message { ConversationId = conversationId, SenderId = senderId, Content = content, ReplyToId = replyToId };
        m._mentions.AddRange(mentionedUserIds.Distinct().Select(id => new MessageMention(m.Id, id)));
        m._attachments.AddRange(files);
        return Result.Success(m);
    }

    public Result Edit(Guid actorId, string content)
    {
        if (IsDeleted) return Result.Failure(Error.NotFound("Message.Deleted", "Tin nhắn đã bị xóa."));
        if (actorId != SenderId) return Result.Failure(Error.Forbidden("Message.NotOwner", "Chỉ người gửi mới được sửa."));
        if (string.IsNullOrWhiteSpace(content) || content.Length > MaxLength) return Result.Failure(new Error("Message.Invalid", "Nội dung không hợp lệ."));
        Content = content.Trim();
        EditedAt = DateTime.UtcNow;
        return Result.Success();
    }

    public Result Delete(Guid actorId, bool canModerate)
    {
        if (IsDeleted) return Result.Failure(Error.NotFound("Message.Deleted", "Tin nhắn đã bị xóa."));
        if (actorId != SenderId && !canModerate) return Result.Failure(Error.Forbidden("Message.NoPermission", "Bạn không có quyền xóa tin nhắn này."));
        Content = "";
        DeletedAt = DateTime.UtcNow;
        DeletedBy = actorId;
        _attachments.Clear();
        _reactions.Clear();
        return Result.Success();
    }

    public Result ToggleReaction(Guid userId, string emoji)
    {
        if (IsDeleted) return Result.Failure(Error.NotFound("Message.Deleted", "Tin nhắn đã bị xóa."));
        if (string.IsNullOrWhiteSpace(emoji) || emoji.Length > 16) return Result.Failure(new Error("Reaction.Invalid", "Emoji không hợp lệ."));
        var existing = _reactions.FirstOrDefault(r => r.UserId == userId && r.Emoji == emoji);
        if (existing is not null) _reactions.Remove(existing);
        else _reactions.Add(new MessageReaction(Id, userId, emoji));
        return Result.Success();
    }
}

public sealed class MessageMention
{
    private MessageMention() { }
    internal MessageMention(Guid messageId, Guid userId) { MessageId = messageId; UserId = userId; }
    public Guid MessageId { get; private set; }
    public Guid UserId { get; private set; }
}

public sealed class MessageReaction
{
    private MessageReaction() { }
    internal MessageReaction(Guid messageId, Guid userId, string emoji) { MessageId = messageId; UserId = userId; Emoji = emoji; }
    public Guid MessageId { get; private set; }
    public Guid UserId { get; private set; }
    public string Emoji { get; private set; } = "";
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
}

public sealed class MessageAttachment : Entity
{
    private MessageAttachment() { }
    public Guid MessageId { get; private set; }
    public Guid FileId { get; private set; }
    public string FileName { get; private set; } = "";
    public string ContentType { get; private set; } = "";
    public long SizeBytes { get; private set; }

    public static MessageAttachment Create(Guid fileId, string fileName, string contentType, long size)
        => new() { FileId = fileId, FileName = fileName, ContentType = contentType, SizeBytes = size };
}

public sealed class PinnedMessage
{
    private PinnedMessage() { }
    public Guid ConversationId { get; private set; }
    public Guid MessageId { get; private set; }
    public Guid PinnedBy { get; private set; }
    public DateTime PinnedAt { get; private set; } = DateTime.UtcNow;

    public static PinnedMessage Create(Guid conversationId, Guid messageId, Guid pinnedBy)
        => new() { ConversationId = conversationId, MessageId = messageId, PinnedBy = pinnedBy };
}
