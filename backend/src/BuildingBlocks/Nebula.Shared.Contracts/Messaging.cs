namespace Nebula.Shared.Contracts;

/// <summary>Cổng publish/subscribe. Application của module chỉ biết interface này, không biết cách vận chuyển bên dưới.</summary>
public interface IEventBus
{
    ValueTask PublishAsync(IIntegrationEvent @event, CancellationToken ct = default);
}

public interface IEventHandler<in TEvent> where TEvent : IIntegrationEvent
{
    Task HandleAsync(TEvent @event, CancellationToken ct);
}

public interface IIntegrationEvent
{
    Guid EventId { get; }
    DateTime OccurredAt { get; }
}

public abstract record IntegrationEvent : IIntegrationEvent
{
    public Guid EventId { get; init; } = Guid.NewGuid();
    public DateTime OccurredAt { get; init; } = DateTime.UtcNow;
}
