using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Nebula.Friends.Application;
using Nebula.Shared.Infrastructure;

namespace Nebula.Friends.Api;

internal sealed class FriendEndpoints : IModuleEndpoints
{
    public void Map(IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/friends").RequireAuthorization();

        g.MapGet("", async (HttpContext c, FriendService s, CancellationToken ct) => Results.Ok(await s.ListFriendsAsync(c.User.GetUserId(), ct)));
        g.MapGet("requests", async (HttpContext c, FriendService s, CancellationToken ct) => Results.Ok(await s.ListRequestsAsync(c.User.GetUserId(), ct)));

        g.MapPost("requests/by-tag", async (SendFriendByTagRequest r, HttpContext c, FriendService s, CancellationToken ct)
            => (await s.SendRequestByTagAsync(c.User.GetUserId(), r.DisplayName, r.UserCode, ct)).ToHttp());
        g.MapPost("requests", async (SendFriendRequest r, HttpContext c, FriendService s, CancellationToken ct)
            => (await s.SendRequestAsync(c.User.GetUserId(), r.UserId, ct)).ToHttp());
        g.MapPost("requests/{id:guid}/accept", async (Guid id, HttpContext c, FriendService s, CancellationToken ct)
            => (await s.AcceptAsync(c.User.GetUserId(), id, ct)).ToHttp());
        g.MapDelete("requests/{id:guid}", async (Guid id, HttpContext c, FriendService s, CancellationToken ct)
            => (await s.DeclineOrCancelAsync(c.User.GetUserId(), id, ct)).ToHttp());
        g.MapDelete("{userId:guid}", async (Guid userId, HttpContext c, FriendService s, CancellationToken ct)
            => (await s.RemoveFriendAsync(c.User.GetUserId(), userId, ct)).ToHttp());
    }
}
