using Microsoft.AspNetCore.Routing;
using Nebula.Shared.Infrastructure;

namespace Nebula.Friends.Api;

internal sealed class FriendEndpoints : IModuleEndpoints
{
    public void Map(IEndpointRouteBuilder app)
    {
        // TODO: làm mấy route dưới, nghiệp vụ xem đặc tả UC04.
        // Nhớ gắn RequireAuthorization() cho route cần đăng nhập, route admin thì RequireAuthorization("Admin").
        //   GET    /api/friends
        //   GET    /api/friends/requests
        //   POST   /api/friends/requests/by-tag
        //   POST   /api/friends/requests
        //   POST   /api/friends/requests/{id:guid}/accept
        //   DELETE /api/friends/requests/{id:guid}
        //   DELETE /api/friends/{userId:guid}
    }
}
