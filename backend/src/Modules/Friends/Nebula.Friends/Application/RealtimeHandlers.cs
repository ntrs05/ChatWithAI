using Nebula.Shared.Contracts;

namespace Nebula.Friends.Application;

/// <summary>Đẩy realtime cho giao diện bạn bè. Mỗi sự kiện gửi tới ĐÚNG hai người liên quan.</summary>
public sealed class FriendRealtimeHandler(IRealtimeGateway gateway, IIdentityApi identity, IFriendshipRepository friendships)
    : IEventHandler<FriendRequestSent>, IEventHandler<FriendRequestAccepted>, IEventHandler<FriendshipEnded>
{
    public async Task HandleAsync(FriendRequestSent e, CancellationToken ct)
    {
        var from = await identity.GetUserAsync(e.RequesterId, ct);
        var to = await identity.GetUserAsync(e.AddresseeId, ct);
        if (from is null || to is null) return;
        var f = await friendships.GetAsync(e.RequestId, ct);
        var at = f?.CreatedAt ?? DateTime.UtcNow;
        // Người nhận thấy lời mời đến; người gửi (các tab khác) thấy lời mời đã gửi đi.
        await gateway.PushToUsersAsync([e.AddresseeId], "FriendRequestReceived", new { request = new FriendRequestDto(e.RequestId, FriendService.ToDto(from), at) }, ct);
        await gateway.PushToUsersAsync([e.RequesterId], "FriendRequestSent", new { request = new FriendRequestDto(e.RequestId, FriendService.ToDto(to), at) }, ct);
    }

    public async Task HandleAsync(FriendRequestAccepted e, CancellationToken ct)
    {
        var a = await identity.GetUserAsync(e.RequesterId, ct);
        var b = await identity.GetUserAsync(e.AddresseeId, ct);
        if (a is null || b is null) return;
        var now = DateTime.UtcNow;
        // Mỗi người nhận hồ sơ của người còn lại.
        await gateway.PushToUsersAsync([e.RequesterId], "FriendAdded", new { friend = new FriendDto(e.RequestId, FriendService.ToDto(b), now), requestId = e.RequestId }, ct);
        await gateway.PushToUsersAsync([e.AddresseeId], "FriendAdded", new { friend = new FriendDto(e.RequestId, FriendService.ToDto(a), now), requestId = e.RequestId }, ct);
    }

    public async Task HandleAsync(FriendshipEnded e, CancellationToken ct)
    {
        // Người còn lại cần biết để bỏ khỏi danh sách; người thực hiện (tab khác) cũng cần đồng bộ.
        await gateway.PushToUsersAsync([e.OtherId], "FriendRemoved", new { userId = e.ActorId, reason = e.Reason }, ct);
        await gateway.PushToUsersAsync([e.ActorId], "FriendRemoved", new { userId = e.OtherId, reason = e.Reason }, ct);
    }
}
