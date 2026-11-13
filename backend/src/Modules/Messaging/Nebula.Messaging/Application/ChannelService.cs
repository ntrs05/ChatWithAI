namespace Nebula.Messaging.Application;

// TODO: request gồm (string Name)
public sealed record CreateCategoryRequest
{
}

// TODO: request gồm (string Name, ChannelKind Kind, Guid? CategoryId, string? Topic = null, bool IsPrivate = false, IReadOnlyList<Guid>? MemberIds = null)
public sealed record CreateChannelRequest
{
}

// TODO: request gồm (string Name, string? Topic, bool? IsPrivate = null)
public sealed record UpdateChannelRequest
{
}

// TODO: request gồm (Guid UserId)
public sealed record ChannelMemberRequest
{
}

// TODO: ListAsync, CreateCategoryAsync, DeleteCategoryAsync, CreateChannelAsync
//       UpdateChannelAsync, ListMembersAsync, AddMemberAsync, RemoveMemberAsync
//       DeleteChannelAsync, CreateDefaultChannelsAsync
public sealed class ChannelService
{
}
