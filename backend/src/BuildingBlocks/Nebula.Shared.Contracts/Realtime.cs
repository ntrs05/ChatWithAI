namespace Nebula.Shared.Contracts;

/// <summary>Cổng đẩy realtime tới client. Module nào cần đẩy (Messaging, Notifications) chỉ biết interface này;
/// SignalR hub nằm trong Messaging và là nơi duy nhất hiện thực nó.</summary>
public interface IRealtimeGateway
{
    Task PushToUsersAsync(IEnumerable<Guid> userIds, string eventName, object payload, CancellationToken ct);
    Task PushToAllAsync(string eventName, object payload, CancellationToken ct);
    Task DisconnectUserAsync(Guid userId, CancellationToken ct);
}
