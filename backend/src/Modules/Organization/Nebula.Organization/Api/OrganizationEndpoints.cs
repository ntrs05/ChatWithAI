using Microsoft.AspNetCore.Routing;
using Nebula.Shared.Infrastructure;

namespace Nebula.Organization.Api;

// TODO: request gồm (Guid UserId)
public sealed record UserIdRequest
{
}

// TODO: request gồm (Guid UserId, string? Reason)
public sealed record ServerBanRequest
{
}

// TODO: request gồm (ServerRole Role)
public sealed record ServerRoleRequest
{
}

// TODO: request gồm (bool Accept)
public sealed record RespondRequest
{
}

// TODO: request gồm (string Value)
public sealed record SettingRequest
{
}

// TODO: request gồm (string Code)
public sealed record JoinCodeRequest
{
}

internal sealed class OrganizationEndpoints : IModuleEndpoints
{
    public void Map(IEndpointRouteBuilder app)
    {
        // TODO: làm mấy route dưới, nghiệp vụ xem đặc tả UC05, UC15, UC16, UC18, UC20, UC21.
        // Nhớ gắn RequireAuthorization() cho route cần đăng nhập, route admin thì RequireAuthorization("Admin").
        //   POST   /api/servers
        //   GET    /api/servers
        //   GET    /api/servers/joinable
        //   POST   /api/servers/join-by-code
        //   POST   /api/servers/{id:guid}/join
        //   GET    /api/servers/{id:guid}/members
        //   GET    /api/servers/{id:guid}
        //   PUT    /api/servers/{id:guid}
        //   DELETE /api/servers/{id:guid}
        //   POST   /api/servers/{id:guid}/leave
        //   POST   /api/servers/{id:guid}/members
        //   DELETE /api/servers/{id:guid}/members/{userId:guid}
        //   PUT    /api/servers/{id:guid}/members/{userId:guid}/role
        //   PUT    /api/servers/{id:guid}/owner
        //   GET    /api/servers/{id:guid}/bans
        //   POST   /api/servers/{id:guid}/bans
        //   DELETE /api/servers/{id:guid}/bans/{userId:guid}
        //   POST   /api/servers/{id:guid}/invites
        //   POST   /api/servers/{id:guid}/join-requests
        //   GET    /api/servers/{id:guid}/join-requests
        //   GET    /api/join-requests/invitations
        //   GET    /api/join-requests/mine
        //   POST   /api/join-requests/{id:guid}/respond
        //   POST   /api/join-requests/{id:guid}/cancel
        //   GET    /api/admin/servers
        //   GET    /api/admin/settings
        //   PUT    /api/admin/settings/{key}
    }
}
