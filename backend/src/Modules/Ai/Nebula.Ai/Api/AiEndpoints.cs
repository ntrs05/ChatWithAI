using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Nebula.Ai.Application;
using Nebula.Shared.Infrastructure;

namespace Nebula.Ai.Api;

internal sealed class AiEndpoints : IModuleEndpoints
{
    public void Map(IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/ai").RequireAuthorization();
        g.MapPost("summarize", async (SummarizeRequest r, HttpContext c, SummaryService s, CancellationToken ct)
            => (await s.SummarizeAsync(c.User.GetUserId(), r, ct)).ToHttp());
    }
}
