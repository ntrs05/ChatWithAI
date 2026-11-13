namespace Nebula.Messaging.Application;

// TODO: các trường (Guid FileId, string FileName, string ContentType, long SizeBytes, string Url)
public sealed record AttachmentDto
{
}

// TODO: các trường (string Emoji, int Count, IReadOnlyList<Guid> UserIds)
public sealed record ReactionDto
{
}

// TODO: các trường (Guid Id, string DisplayName, string Username, string? AvatarUrl)
public sealed record AuthorDto
{
}

// TODO: các trường (Guid Id, Guid ConversationId, Guid SenderId, string Content, Guid? ReplyToId, DateTime CreatedAt, DateTime? EditedAt, bool IsDeleted, bool IsPinned, IReadOnlyList<Guid> Mentions, IReadOnlyList<AttachmentDto> Attachments, IReadOnlyList<ReactionDto> Reactions, Guid? ServerId = null, AuthorDto? Author = null)
//       From
public sealed record MessageDto
{
}

// TODO: các trường (IReadOnlyList<MessageDto> Messages, bool HasMore)
public sealed record MessagePageDto
{
}

// TODO: các trường (Guid ChannelId, Guid ServerId, AuthorDto User, string ClientId, bool Muted, bool Deafened, DateTime JoinedAt)
public sealed record VoiceParticipantDto
{
}

// TODO: các trường (Guid Id, Guid ServerId, Guid? CategoryId, string Name, string? Topic, string Kind, int Position, DateTime CreatedAt = default, bool IsPrivate = false)
//       From
public sealed record ChannelDto
{
}

// TODO: các trường (Guid Id, string Name, int Position, IReadOnlyList<ChannelDto> Channels)
public sealed record CategoryDto
{
}

// TODO: các trường (Guid ServerId, IReadOnlyList<CategoryDto> Categories, IReadOnlyList<ChannelDto> Uncategorized)
public sealed record ServerChannelsDto
{
}

// TODO: các trường (Guid ConversationId, Guid OtherUserId, bool IsArchived, DateTime? LastMessageAt, bool HasUnread, AuthorDto? Other = null, bool IsFriend = true)
public sealed record DirectDto
{
}
