using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Nebula.Messaging.Application;
using Nebula.Shared.Contracts;
using Nebula.Shared.Infrastructure;

namespace Nebula.Messaging.Api;

/// <summary>Theo dõi các kết nối đang mở của từng người (nhiều tab/thiết bị). Online khi có kết nối đầu tiên,
/// Offline khi đóng kết nối cuối cùng, và cho phép ngắt toàn bộ kết nối của người bị cấm.
/// Lưu trong bộ nhớ tiến trình: đủ cho 1 instance; chạy nhiều instance thì cần Redis backplane.</summary>
public sealed class PresenceTracker
{
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, HubCallerContext>> _connections = new();

    /// <returns>true nếu đây là kết nối đầu tiên của người này.</returns>
    public bool Connected(Guid userId, HubCallerContext ctx)
    {
        var set = _connections.GetOrAdd(userId, _ => new());
        set[ctx.ConnectionId] = ctx;
        return set.Count == 1;
    }

    /// <returns>true nếu vừa đóng kết nối cuối cùng.</returns>
    public bool Disconnected(Guid userId, string connectionId)
    {
        if (!_connections.TryGetValue(userId, out var set)) return false;
        set.TryRemove(connectionId, out _);
        if (!set.IsEmpty) return false;
        _connections.TryRemove(userId, out _);
        return true;
    }

    public void AbortAll(Guid userId)
    {
        if (!_connections.TryGetValue(userId, out var set)) return;
        foreach (var ctx in set.Values) ctx.Abort();
    }
}

/// <summary>SignalR dùng claim "sub" làm định danh người dùng, để gửi theo UserId.</summary>
internal sealed class SubUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) => connection.User.FindFirst("sub")?.Value;
}

[Authorize]
public sealed class ChatHub(PresenceTracker presence, IEventBus bus, ConversationAccess access, IIdentityApi identity, VoiceService voice) : Hub
{
    private Guid UserId => Context.User!.GetUserId();

    public override async Task OnConnectedAsync()
    {
        if (presence.Connected(UserId, Context)) await bus.PublishAsync(new UserConnected(UserId));
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (presence.Disconnected(UserId, Context.ConnectionId)) await bus.PublishAsync(new UserDisconnected(UserId));
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>"Đang gõ...". Chỉ phát tạm thời cho người trong hội thoại, KHÔNG lưu vào DB.
    /// Client nên gọi tối đa vài giây một lần. Người đã tắt typing indicator trong cài đặt thì server bỏ qua.</summary>
    public async Task Typing(Guid conversationId)
    {
        if (await identity.GetUserAsync(UserId, Context.ConnectionAborted) is not { TypingIndicatorEnabled: true } me) return;
        var a = await access.CheckAsync(conversationId, UserId, Context.ConnectionAborted);
        if (a is null || !a.CanRead) return;
        var others = a.ParticipantIds.Where(id => id != UserId).Select(id => id.ToString()).ToList();
        await Clients.Users(others).SendAsync("Typing", new { ConversationId = conversationId, UserId, me.DisplayName });
    }

    /// <summary>Chuyển tiếp tín hiệu WebRTC (offer/answer/ICE) cho người khác trong cùng kênh thoại.</summary>
    public Task VoiceSignal(VoiceSignalDto signal) => voice.RelaySignalAsync(UserId, signal, Context.ConnectionAborted);
}

internal sealed class SignalRGateway(IHubContext<ChatHub> hub, PresenceTracker presence) : IRealtimeGateway
{
    public Task PushToUsersAsync(IEnumerable<Guid> userIds, string eventName, object payload, CancellationToken ct)
        => hub.Clients.Users(userIds.Select(x => x.ToString()).ToList()).SendAsync(eventName, payload, ct);

    public Task PushToAllAsync(string eventName, object payload, CancellationToken ct)
        => hub.Clients.All.SendAsync(eventName, payload, ct);

    public Task DisconnectUserAsync(Guid userId, CancellationToken ct)
    {
        presence.AbortAll(userId);
        return Task.CompletedTask;
    }
}
