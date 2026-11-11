using Microsoft.AspNetCore.Routing;
using Nebula.Shared.Infrastructure;

namespace Nebula.Media.Api;

internal sealed class MediaEndpoints : IModuleEndpoints
{
    public void Map(IEndpointRouteBuilder app)
    {
        // TODO: làm mấy route dưới, nghiệp vụ xem đặc tả UC09, UC20 (hạn mức).
        // Nhớ gắn RequireAuthorization() cho route cần đăng nhập, route admin thì RequireAuthorization("Admin").
        //   POST   /api/files
        //   GET    /api/files
        //   GET    /api/files/quota
        //   GET    /api/files/{id:guid}
        //   DELETE /api/files/{id:guid}
        //   POST   /api/avatars
        //   GET    /api/avatars/{id:guid}
        //   GET    /api/admin/users/{userId:guid}/quota
        //   PUT    /api/admin/users/{userId:guid}/quota
    }
}
