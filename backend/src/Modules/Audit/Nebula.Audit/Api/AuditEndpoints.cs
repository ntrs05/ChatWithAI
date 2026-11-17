using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Nebula.Audit.Application;
using Nebula.Shared.Infrastructure;

namespace Nebula.Audit.Api;

internal sealed class AuditEndpoints : IModuleEndpoints
{
    public void Map(IEndpointRouteBuilder app)
    {
        // Admin hệ thống xem nhật ký: ?actorId=&action=&targetId=&from=&to=&skip=&take=
        app.MapGet("/api/admin/audit-logs", async (Guid? actorId, string? action, string? targetId, DateTime? from, DateTime? to,
                int? skip, int? take, AuditService s, CancellationToken ct)
            => Results.Ok(await s.SearchAsync(new AuditQuery(actorId, action, targetId, from, to, skip ?? 0, take ?? 50), ct)))
            .RequireAuthorization("Admin");
    }
}
