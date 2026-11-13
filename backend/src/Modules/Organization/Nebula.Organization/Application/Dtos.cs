namespace Nebula.Organization.Application;

// TODO: request gồm (string Name, string? Description, JoinPolicy JoinPolicy = JoinPolicy.InviteOnly)
public sealed record CreateServerRequest
{
}

// TODO: request gồm (string Name, string? Description, string? AvatarUrl, JoinPolicy JoinPolicy)
public sealed record UpdateServerRequest
{
}

// TODO: các trường (Guid Id, string Name, string JoinPolicy, Guid OwnerId, int MemberCount, string? MyRole, string? Description = null, string? AvatarUrl = null, string? InviteCode = null, Guid CreatedBy = default, DateTime CreatedAt = default)
//       From
public sealed record ServerSummaryDto
{
}

// TODO: các trường (Guid ServerId, Guid UserId, string DisplayName, string Username, string? AvatarUrl, string Status, string Role, DateTime JoinedAt)
public sealed record MemberProfileDto
{
}

// TODO: các trường (Guid UserId, string Role, Guid AddedBy, DateTime JoinedAt)
public sealed record ServerMemberDto
{
}

// TODO: các trường (Guid Id, string Name, string? Description, string? AvatarUrl, string JoinPolicy, Guid CreatedBy, DateTime CreatedAt, string? MyRole, IReadOnlyList<ServerMemberDto> Members, string? InviteCode = null)
//       From
public sealed record ServerDetailDto
{
}

// TODO: các trường (Guid UserId, string? Reason, Guid BannedBy, DateTime BannedAt)
public sealed record ServerBanDto
{
}

// TODO: các trường (Guid Id, Guid ServerId, Guid UserId, string Type, string Status, Guid CreatedBy, DateTime CreatedAt)
//       From
public sealed record JoinRequestDto
{
}

// TODO: các trường (string Key, string Value)
public sealed record SettingDto
{
}

// TODO: các trường (Guid Id, string DisplayName, string Username, string? AvatarUrl)
public sealed record InviterDto
{
}

// TODO: các trường (Guid Id, Guid ServerId, string ServerName, string? ServerAvatarUrl, int MemberCount, InviterDto InvitedBy, DateTime CreatedAt)
public sealed record InvitationDto
{
}
