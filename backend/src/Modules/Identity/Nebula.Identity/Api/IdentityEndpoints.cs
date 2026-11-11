using Microsoft.AspNetCore.Routing;
using Nebula.Shared.Infrastructure;

namespace Nebula.Identity.Api;

// TODO: request gồm (string IdToken)
public sealed record GoogleLoginRequest
{
}

// TODO: request gồm (UserStatus Status)
public sealed record SetStatusRequest
{
}

internal sealed class IdentityEndpoints : IModuleEndpoints
{
    public void Map(IEndpointRouteBuilder app)
    {
        // TODO: làm mấy route dưới, nghiệp vụ xem đặc tả UC01, UC02, UC03, UC19.
        // Nhớ gắn RequireAuthorization() cho route cần đăng nhập, route admin thì RequireAuthorization("Admin").
        //   POST   /api/auth/google
        //   POST   /api/auth/register
        //   POST   /api/auth/login
        //   GET    /api/users/me
        //   PUT    /api/users/me
        //   PUT    /api/users/me/password
        //   PUT    /api/users/me/status
        //   PUT    /api/users/me/settings
        //   GET    /api/users/search
        //   GET    /api/users/{id:guid}
        //   GET    /api/admin/users
        //   POST   /api/admin/users/{id:guid}/lock
        //   POST   /api/admin/users/{id:guid}/unlock
    }
}
