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

        // Cách chính: phải biết cả TÊN lẫn ID (hiện ở góc dưới bên trái và trong Cài đặt của người kia).
        g.MapPost("requests/by-tag", async (SendFriendByTagRequest r, HttpContext c, FriendService s, CancellationToken ct)
            => (await s.SendRequestByTagAsync(c.User.GetUserId(), r.DisplayName, r.UserCode, ct)).ToHttp());
        // Theo userId (Guid) — dành cho hệ thống / người đã biết Guid nội bộ.
        g.MapPost("requests", async (SendFriendRequest r, HttpContext c, FriendService s, CancellationToken ct)
            => (await s.SendRequestAsync(c.User.GetUserId(), r.UserId, ct)).ToHttp());
        g.MapPost("requests/{id:guid}/accept", async (Guid id, HttpContext c, FriendService s, CancellationToken ct)
            => (await s.AcceptAsync(c.User.GetUserId(), id, ct)).ToHttp());
        // Từ chối (người nhận) hoặc hủy lời mời đã gửi (người gửi).
        g.MapDelete("requests/{id:guid}", async (Guid id, HttpContext c, FriendService s, CancellationToken ct)
            => (await s.DeclineOrCancelAsync(c.User.GetUserId(), id, ct)).ToHttp());
        // Hủy kết bạn.
        g.MapDelete("{userId:guid}", async (Guid userId, HttpContext c, FriendService s, CancellationToken ct)
            => (await s.RemoveFriendAsync(c.User.GetUserId(), userId, ct)).ToHttp());
    }
}
