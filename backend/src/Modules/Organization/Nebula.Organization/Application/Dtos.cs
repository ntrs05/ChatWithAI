using Nebula.Organization.Domain;

namespace Nebula.Organization.Application;

public sealed record CreateServerRequest(string Name, string? Description, JoinPolicy JoinPolicy = JoinPolicy.InviteOnly);
public sealed record UpdateServerRequest(string Name, string? Description, string? AvatarUrl, JoinPolicy JoinPolicy);

public sealed record ServerSummaryDto(
    Guid Id, string Name, string JoinPolicy, Guid OwnerId, int MemberCount, string? MyRole,
    string? Description = null, string? AvatarUrl = null, string? InviteCode = null, Guid CreatedBy = default, DateTime CreatedAt = default)
{
    public static ServerSummaryDto From(Server g, Guid viewerId)
        => new(g.Id, g.Name, g.JoinPolicy.ToString(), g.OwnerId, g.Members.Count, g.RoleOf(viewerId)?.ToString(),
            g.Description, g.AvatarUrl, g.IsMember(viewerId) ? g.InviteCode : null, g.CreatedBy, g.CreatedAt);
}

public sealed record MemberProfileDto(Guid ServerId, Guid UserId, string DisplayName, string Username, string? AvatarUrl, string Status, string Role, DateTime JoinedAt);

public sealed record ServerMemberDto(Guid UserId, string Role, Guid AddedBy, DateTime JoinedAt);

public sealed record ServerDetailDto(
    Guid Id, string Name, string? Description, string? AvatarUrl, string JoinPolicy,
    Guid CreatedBy, DateTime CreatedAt, string? MyRole, IReadOnlyList<ServerMemberDto> Members, string? InviteCode = null)
{
    public static ServerDetailDto From(Server g, Guid viewerId) => new(
        g.Id, g.Name, g.Description, g.AvatarUrl, g.JoinPolicy.ToString(), g.CreatedBy, g.CreatedAt,
        g.RoleOf(viewerId)?.ToString(),
        g.Members.OrderByDescending(m => m.Role).ThenBy(m => m.CreatedAt)
            .Select(m => new ServerMemberDto(m.UserId, m.Role.ToString(), m.AddedBy, m.CreatedAt)).ToList(),
        g.IsMember(viewerId) ? g.InviteCode : null);
}

public sealed record ServerBanDto(Guid UserId, string? Reason, Guid BannedBy, DateTime BannedAt);

public sealed record JoinRequestDto(Guid Id, Guid ServerId, Guid UserId, string Type, string Status, Guid CreatedBy, DateTime CreatedAt)
{
    public static JoinRequestDto From(JoinRequest r) => new(r.Id, r.ServerId, r.UserId, r.Type.ToString(), r.Status.ToString(), r.CreatedBy, r.CreatedAt);
}

public sealed record SettingDto(string Key, string Value);

public sealed record InviterDto(Guid Id, string DisplayName, string Username, string? AvatarUrl);
public sealed record InvitationDto(Guid Id, Guid ServerId, string ServerName, string? ServerAvatarUrl, int MemberCount, InviterDto InvitedBy, DateTime CreatedAt);
