using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Nebula.Messaging.Application;
using Nebula.Shared.Contracts;
using Nebula.Shared.Infrastructure;

namespace Nebula.Messaging.Api;

public sealed class PresenceTracker
{
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, HubCallerContext>> _connections = new();

    public bool Connected(Guid userId, HubCallerContext ctx)
    {
        var set = _connections.GetOrAdd(userId, _ => new());
        set[ctx.ConnectionId] = ctx;
        return set.Count == 1;
    }

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

    public async Task Typing(Guid conversationId)
    {
        if (await identity.GetUserAsync(UserId, Context.ConnectionAborted) is not { TypingIndicatorEnabled: true } me) return;
        var a = await access.CheckAsync(conversationId, UserId, Context.ConnectionAborted);
        if (a is null || !a.CanRead) return;
        var others = a.ParticipantIds.Where(id => id != UserId).Select(id => id.ToString()).ToList();
        await Clients.Users(others).SendAsync("Typing", new { ConversationId = conversationId, UserId, me.DisplayName });
    }

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
