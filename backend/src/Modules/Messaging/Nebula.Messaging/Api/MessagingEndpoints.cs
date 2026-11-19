using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Nebula.Messaging.Application;
using Nebula.Shared.Infrastructure;

namespace Nebula.Messaging.Api;

public sealed record UserIdRequest(Guid UserId);
public sealed record EditMessageRequest(string Content);
public sealed record ReactRequest(string Emoji);
public sealed record ArchiveRequest(bool Archived);
public sealed record VoiceTokenRequest(string ClientId);
public sealed record VoiceStateRequest(string ClientId, bool Muted, bool Deafened);

internal sealed class MessagingEndpoints : IModuleEndpoints
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapHub<ChatHub>("/hubs/chat");   // realtime hub

        var api = app.MapGroup("/api").RequireAuthorization();

        // category và kênh
        api.MapGet("servers/{serverId:guid}/channels", async (Guid serverId, HttpContext c, ChannelService s, CancellationToken ct)
            => (await s.ListAsync(c.User.GetUserId(), serverId, ct)).ToHttp());
        api.MapPost("servers/{serverId:guid}/categories", async (Guid serverId, CreateCategoryRequest r, HttpContext c, ChannelService s, CancellationToken ct)
            => (await s.CreateCategoryAsync(c.User.GetUserId(), serverId, r.Name, ct)).ToHttp());
        api.MapDelete("categories/{id:guid}", async (Guid id, HttpContext c, ChannelService s, CancellationToken ct)
            => (await s.DeleteCategoryAsync(c.User.GetUserId(), id, ct)).ToHttp());
        api.MapPost("servers/{serverId:guid}/channels", async (Guid serverId, CreateChannelRequest r, HttpContext c, ChannelService s, CancellationToken ct)
            => (await s.CreateChannelAsync(c.User.GetUserId(), serverId, r, ct)).ToHttp());
        api.MapPut("channels/{id:guid}", async (Guid id, UpdateChannelRequest r, HttpContext c, ChannelService s, CancellationToken ct)
            => (await s.UpdateChannelAsync(c.User.GetUserId(), id, r, ct)).ToHttp());
        api.MapDelete("channels/{id:guid}", async (Guid id, HttpContext c, ChannelService s, CancellationToken ct)
            => (await s.DeleteChannelAsync(c.User.GetUserId(), id, ct)).ToHttp());

        // thành viên kênh riêng tư
        api.MapGet("channels/{id:guid}/members", async (Guid id, HttpContext c, ChannelService s, CancellationToken ct)
            => (await s.ListMembersAsync(c.User.GetUserId(), id, ct)).ToHttp());
        api.MapPost("channels/{id:guid}/members", async (Guid id, ChannelMemberRequest r, HttpContext c, ChannelService s, CancellationToken ct)
            => (await s.AddMemberAsync(c.User.GetUserId(), id, r.UserId, ct)).ToHttp());
        api.MapDelete("channels/{id:guid}/members/{userId:guid}", async (Guid id, Guid userId, HttpContext c, ChannelService s, CancellationToken ct)
            => (await s.RemoveMemberAsync(c.User.GetUserId(), id, userId, ct)).ToHttp());

        // chat 1-1
        api.MapPost("direct", async (UserIdRequest r, HttpContext c, DirectService s, CancellationToken ct)
            => (await s.OpenAsync(c.User.GetUserId(), r.UserId, ct)).ToHttp());
        api.MapGet("direct", async (bool? archived, HttpContext c, DirectService s, CancellationToken ct)
            => Results.Ok(await s.ListAsync(c.User.GetUserId(), archived ?? false, ct)));
        api.MapPut("direct/{id:guid}/archive", async (Guid id, ArchiveRequest r, HttpContext c, DirectService s, CancellationToken ct)
            => (await s.SetArchivedAsync(c.User.GetUserId(), id, r.Archived, ct)).ToHttp());
        api.MapDelete("direct/{id:guid}", async (Guid id, HttpContext c, DirectService s, CancellationToken ct)
            => (await s.ClearAsync(c.User.GetUserId(), id, ct)).ToHttp());

        // tin nhắn
        api.MapGet("conversations/{id:guid}/messages", async (Guid id, DateTime? before, int? take, HttpContext c, MessageService s, CancellationToken ct)
            => (await s.HistoryAsync(c.User.GetUserId(), id, before, take ?? 50, ct)).ToHttp());
        api.MapPost("conversations/{id:guid}/messages", async (Guid id, SendMessageRequest r, HttpContext c, MessageService s, CancellationToken ct)
            => (await s.SendAsync(c.User.GetUserId(), id, r, ct)).ToHttp());
        // lịch sử: tin cũ → mới + hasMore, beforeId = tin cũ nhất đang hiện
        api.MapGet("conversations/{id:guid}/history", async (Guid id, Guid? beforeId, int? take, HttpContext c, MessageService s, CancellationToken ct)
            => (await s.PageAsync(c.User.GetUserId(), id, beforeId, take ?? 30, ct)).ToHttp());
        api.MapGet("conversations/{id:guid}/pins", async (Guid id, HttpContext c, MessageService s, CancellationToken ct)
            => (await s.PinnedAsync(c.User.GetUserId(), id, ct)).ToHttp());
        api.MapPut("conversations/{id:guid}/read", async (Guid id, HttpContext c, MessageService s, CancellationToken ct)
            => (await s.MarkReadAsync(c.User.GetUserId(), id, ct)).ToHttp());
        api.MapGet("messages/{id:guid}", async (Guid id, HttpContext c, MessageService s, CancellationToken ct)
            => (await s.GetAsync(c.User.GetUserId(), id, ct)).ToHttp());
        api.MapPut("messages/{id:guid}", async (Guid id, EditMessageRequest r, HttpContext c, MessageService s, CancellationToken ct)
            => (await s.EditAsync(c.User.GetUserId(), id, r.Content, ct)).ToHttp());
        api.MapDelete("messages/{id:guid}", async (Guid id, HttpContext c, MessageService s, CancellationToken ct)
            => (await s.DeleteAsync(c.User.GetUserId(), id, ct)).ToHttp());
        api.MapPut("messages/{id:guid}/pin", async (Guid id, HttpContext c, MessageService s, CancellationToken ct)
            => (await s.PinAsync(c.User.GetUserId(), id, true, ct)).ToHttp());
        api.MapDelete("messages/{id:guid}/pin", async (Guid id, HttpContext c, MessageService s, CancellationToken ct)
            => (await s.PinAsync(c.User.GetUserId(), id, false, ct)).ToHttp());
        api.MapPost("messages/{id:guid}/reactions", async (Guid id, ReactRequest r, HttpContext c, MessageService s, CancellationToken ct)
            => (await s.ReactAsync(c.User.GetUserId(), id, r.Emoji, ct)).ToHttp());

        // kênh thoại, tín hiệu webrtc đi qua hub
        api.MapGet("servers/{serverId:guid}/voice-states", async (Guid serverId, HttpContext c, VoiceService s, CancellationToken ct)
            => (await s.ListAsync(c.User.GetUserId(), serverId, ct)).ToHttp());
        api.MapPost("channels/{id:guid}/voice/join", async (Guid id, VoiceJoinRequest r, HttpContext c, VoiceService s, CancellationToken ct)
            => (await s.JoinAsync(c.User.GetUserId(), id, r, ct)).ToHttp());
        api.MapPost("channels/{id:guid}/voice/leave", async (Guid id, VoiceLeaveRequest r, HttpContext c, VoiceService s, CancellationToken ct)
            => (await s.LeaveAsync(c.User.GetUserId(), id, r.ClientId, ct)).ToHttp());
        // token livekit, 404 nếu chưa cấu hình
        api.MapPost("channels/{id:guid}/voice/token", async (Guid id, VoiceTokenRequest r, HttpContext c, VoiceTokenService s, CancellationToken ct)
            => (await s.CreateAsync(c.User.GetUserId(), id, r.ClientId, ct)).ToHttp());
        api.MapPut("channels/{id:guid}/voice/state", async (Guid id, VoiceStateRequest r, HttpContext c, VoiceService s, CancellationToken ct)
            => (await s.UpdateAsync(c.User.GetUserId(), id, r.ClientId, r.Muted, r.Deafened, ct)).ToHttp());

        // tìm kiếm có bộ lọc
        api.MapGet("search", async (string? q, Guid? senderId, Guid? conversationId, DateTime? from, DateTime? to, int? skip, int? take,
                HttpContext c, MessageService s, CancellationToken ct)
            => Results.Ok(await s.SearchAsync(c.User.GetUserId(), q, senderId, conversationId, from, to, skip ?? 0, take ?? 30, ct)));
    }
}
