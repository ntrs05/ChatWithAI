using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Nebula.Notifications.Application;
using Nebula.Shared.Infrastructure;

namespace Nebula.Notifications.Api;

public sealed record MentionsOnlyRequest(bool Value);

internal sealed class NotificationEndpoints : IModuleEndpoints
{
    public void Map(IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/notifications").RequireAuthorization();

        // hộp thư
        g.MapGet("", async (bool? unreadOnly, int? skip, int? take, HttpContext c, NotificationService s, CancellationToken ct)
            => Results.Ok(await s.ListAsync(c.User.GetUserId(), unreadOnly ?? false, skip ?? 0, take ?? 30, ct)));
        g.MapGet("unread-count", async (HttpContext c, NotificationService s, CancellationToken ct)
            => Results.Ok(new { count = await s.CountUnreadAsync(c.User.GetUserId(), ct) }));
        g.MapPut("{id:guid}/read", async (Guid id, HttpContext c, NotificationService s, CancellationToken ct)
            => (await s.MarkReadAsync(c.User.GetUserId(), id, ct)).ToHttp());
        g.MapPut("read-all", async (HttpContext c, NotificationService s, CancellationToken ct)
            => { await s.MarkAllReadAsync(c.User.GetUserId(), ct); return Results.NoContent(); });

        // cài đặt chung
        g.MapGet("preferences", async (HttpContext c, NotificationService s, CancellationToken ct)
            => Results.Ok(await s.GetPreferenceAsync(c.User.GetUserId(), ct)));
        g.MapPut("preferences/mentions-only", async (MentionsOnlyRequest r, HttpContext c, NotificationService s, CancellationToken ct)
            => { await s.SetMentionsOnlyAsync(c.User.GetUserId(), r.Value, ct); return Results.NoContent(); });

        // cài đặt theo server
        g.MapGet("servers", async (HttpContext c, NotificationService s, CancellationToken ct)
            => Results.Ok(await s.ListServerSettingsAsync(c.User.GetUserId(), ct)));
        g.MapPut("servers/{serverId:guid}", async (Guid serverId, ServerSettingRequest r, HttpContext c, NotificationService s, CancellationToken ct)
            => (await s.SetServerSettingAsync(c.User.GetUserId(), serverId, r, ct)).ToHttp());
        g.MapDelete("servers/{serverId:guid}", async (Guid serverId, HttpContext c, NotificationService s, CancellationToken ct)
            => { await s.ResetServerSettingAsync(c.User.GetUserId(), serverId, ct); return Results.NoContent(); });

        // cài đặt từng hội thoại
        g.MapGet("conversations/{conversationId:guid}", async (Guid conversationId, HttpContext c, NotificationService s, CancellationToken ct)
            => Results.Ok(await s.GetConversationSettingAsync(c.User.GetUserId(), conversationId, ct)));
        g.MapPut("conversations/{conversationId:guid}", async (Guid conversationId, ConversationSettingRequest r, HttpContext c, NotificationService s, CancellationToken ct)
            => { await s.SetConversationSettingAsync(c.User.GetUserId(), conversationId, r, ct); return Results.NoContent(); });
        g.MapDelete("conversations/{conversationId:guid}", async (Guid conversationId, HttpContext c, NotificationService s, CancellationToken ct)
            => { await s.ResetConversationSettingAsync(c.User.GetUserId(), conversationId, ct); return Results.NoContent(); });
    }
}
