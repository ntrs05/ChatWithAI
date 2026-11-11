using Microsoft.AspNetCore.Routing;
using Nebula.Shared.Infrastructure;

namespace Nebula.Audit.Api;

internal sealed class AuditEndpoints : IModuleEndpoints
{
    public void Map(IEndpointRouteBuilder app)
    {
        // TODO: làm mấy route dưới, nghiệp vụ xem đặc tả UC22.
        // Nhớ gắn RequireAuthorization() cho route cần đăng nhập, route admin thì RequireAuthorization("Admin").
        //   GET    /api/admin/audit-logs
    }
}
