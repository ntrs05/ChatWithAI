namespace Nebula.Shared.Contracts;

public interface IRealtimeGateway
{
    Task PushToUsersAsync(IEnumerable<Guid> userIds, string eventName, object payload, CancellationToken ct);
    Task PushToAllAsync(string eventName, object payload, CancellationToken ct);
    Task DisconnectUserAsync(Guid userId, CancellationToken ct);
}
