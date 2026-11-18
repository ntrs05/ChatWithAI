using Nebula.Messaging.Domain;

namespace Nebula.Messaging.Application;

public sealed record AttachmentDto(Guid FileId, string FileName, string ContentType, long SizeBytes, string Url);
public sealed record ReactionDto(string Emoji, int Count, IReadOnlyList<Guid> UserIds);

public sealed record AuthorDto(Guid Id, string DisplayName, string Username, string? AvatarUrl);

public sealed record MessageDto(
    Guid Id, Guid ConversationId, Guid SenderId, string Content, Guid? ReplyToId,
    DateTime CreatedAt, DateTime? EditedAt, bool IsDeleted, bool IsPinned,
    IReadOnlyList<Guid> Mentions, IReadOnlyList<AttachmentDto> Attachments, IReadOnlyList<ReactionDto> Reactions,
    Guid? ServerId = null, AuthorDto? Author = null)
{
    public static MessageDto From(Message m, bool isPinned = false) => new(
        m.Id, m.ConversationId, m.SenderId, m.Content, m.ReplyToId, m.CreatedAt, m.EditedAt, m.IsDeleted, isPinned,
        m.Mentions.Select(x => x.UserId).ToList(),
        m.Attachments.Select(a => new AttachmentDto(a.FileId, a.FileName, a.ContentType, a.SizeBytes, $"/api/files/{a.FileId}")).ToList(),
        m.Reactions.GroupBy(r => r.Emoji).Select(g => new ReactionDto(g.Key, g.Count(), g.Select(r => r.UserId).ToList())).ToList());
}

public sealed record MessagePageDto(IReadOnlyList<MessageDto> Messages, bool HasMore);

public sealed record VoiceParticipantDto(Guid ChannelId, Guid ServerId, AuthorDto User, string ClientId, bool Muted, bool Deafened, DateTime JoinedAt);

public sealed record ChannelDto(Guid Id, Guid ServerId, Guid? CategoryId, string Name, string? Topic, string Kind, int Position, DateTime CreatedAt = default, bool IsPrivate = false)
{
    public static ChannelDto From(Conversation c) => new(c.Id, c.ServerId!.Value, c.CategoryId, c.Name!, c.Topic, c.Kind!.Value.ToString(), c.Position, c.CreatedAt, c.IsPrivate);
}

public sealed record CategoryDto(Guid Id, string Name, int Position, IReadOnlyList<ChannelDto> Channels);

public sealed record ServerChannelsDto(Guid ServerId, IReadOnlyList<CategoryDto> Categories, IReadOnlyList<ChannelDto> Uncategorized);

public sealed record DirectDto(Guid ConversationId, Guid OtherUserId, bool IsArchived, DateTime? LastMessageAt, bool HasUnread, AuthorDto? Other = null, bool IsFriend = true);
