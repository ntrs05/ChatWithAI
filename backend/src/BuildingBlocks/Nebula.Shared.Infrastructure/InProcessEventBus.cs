using System.Threading.Channels;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Nebula.Shared.Contracts;

namespace Nebula.Shared.Infrastructure;

internal sealed class EventChannel
{
    private readonly Channel<IIntegrationEvent> _channel =
        Channel.CreateUnbounded<IIntegrationEvent>(new UnboundedChannelOptions { SingleReader = true });
    public ChannelWriter<IIntegrationEvent> Writer => _channel.Writer;
    public ChannelReader<IIntegrationEvent> Reader => _channel.Reader;
}

internal sealed class InProcessEventBus(EventChannel channel) : IEventBus
{
    public ValueTask PublishAsync(IIntegrationEvent @event, CancellationToken ct = default)
        => channel.Writer.WriteAsync(@event, ct);
}

internal sealed class EventDispatcher(EventChannel channel, IServiceScopeFactory scopes, ILogger<EventDispatcher> log)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await foreach (var evt in channel.Reader.ReadAllAsync(ct))
        {
            using var scope = scopes.CreateScope();
            var handlerType = typeof(IEventHandler<>).MakeGenericType(evt.GetType());
            var method = handlerType.GetMethod(nameof(IEventHandler<IIntegrationEvent>.HandleAsync))!;

            foreach (var handler in scope.ServiceProvider.GetServices(handlerType))
            {
                try { await (Task)method.Invoke(handler, [evt, ct])!; }
                catch (Exception ex)
                {
                    log.LogError(ex, "Handler {Handler} lỗi khi xử lý {Event}", handler!.GetType().Name, evt.GetType().Name);
                }
            }
        }
    }
}

public static class EventBusExtensions
{
    public static IServiceCollection AddEventBus(this IServiceCollection services)
    {
        services.AddSingleton<EventChannel>();
        services.AddSingleton<IEventBus, InProcessEventBus>();
        services.AddHostedService<EventDispatcher>();
        return services;
    }

    /// <summary>Đăng ký THandler lắng nghe TEvent.</summary>
    public static IServiceCollection AddEventHandler<TEvent, THandler>(this IServiceCollection services)
        where TEvent : IIntegrationEvent
        where THandler : class, IEventHandler<TEvent>
        => services.AddScoped<IEventHandler<TEvent>, THandler>();
}
