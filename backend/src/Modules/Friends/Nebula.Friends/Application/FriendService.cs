namespace Nebula.Friends.Application;

// TODO: request gồm (Guid UserId)
public sealed record SendFriendRequest
{
}

// TODO: request gồm (string DisplayName, string UserCode)
public sealed record SendFriendByTagRequest
{
}

// TODO: các trường (Guid Id, string DisplayName, string Username, string? AvatarUrl, string Status)
public sealed record FriendUserDto
{
}

// TODO: các trường (Guid Id, FriendUserDto User, DateTime Since)
public sealed record FriendDto
{
}

// TODO: các trường (Guid Id, FriendUserDto User, DateTime CreatedAt)
public sealed record FriendRequestDto
{
}

// TODO: các trường (IReadOnlyList<FriendRequestDto> Incoming, IReadOnlyList<FriendRequestDto> Outgoing)
public sealed record FriendRequestsDto
{
}

// TODO: các trường (Guid Id, bool AutoAccepted)
public sealed record SendResultDto
{
}

// TODO: SendRequestByTagAsync, SendRequestAsync, AcceptAsync, DeclineOrCancelAsync
//       RemoveFriendAsync, ListFriendsAsync, ListRequestsAsync, ToDto
public sealed class FriendService
{
}
