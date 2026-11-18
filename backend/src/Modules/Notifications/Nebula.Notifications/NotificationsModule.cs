using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nebula.Notifications.Api;
using Nebula.Notifications.Application;
using Nebula.Notifications.Infrastructure;
using Nebula.Shared.Contracts;
using Nebula.Shared.Infrastructure;

namespace Nebula.Notifications;

public static class NotificationsModule
{
    public static IServiceCollection AddNotificationsModule(this IServiceCollection services, IConfiguration cfg)
    {
        services.AddModuleDbContext<NotificationsDbContext>(cfg, "notifications");
        services.AddScoped<INotificationsUnitOfWork>(sp => sp.GetRequiredService<NotificationsDbContext>());
        services.AddScoped<INotificationRepository, EfNotificationRepository>();
        services.AddScoped<NotificationService>();
        services.AddScoped<Notifier>();

        services.AddEventHandler<MessageSent, MessageSentHandler>();
        services.AddEventHandler<UserStatusChanged, UserStatusChangedHandler>();
        services.AddEventHandler<ServerCreated, ServerNotificationHandler>();
        services.AddEventHandler<MemberAddedToServer, ServerNotificationHandler>();
        services.AddEventHandler<MemberRemovedFromServer, ServerNotificationHandler>();
        services.AddEventHandler<MemberRoleChanged, ServerNotificationHandler>();
        services.AddEventHandler<JoinRequestCreated, ServerNotificationHandler>();
        services.AddEventHandler<FriendRequestSent, FriendNotificationHandler>();
        services.AddEventHandler<FriendRequestAccepted, FriendNotificationHandler>();
        services.AddEventHandler<MemberRemovedFromServer, ServerSettingCleanupHandler>();
        services.AddEventHandler<ServerDeleted, ServerSettingCleanupHandler>();
        return services;
    }

    public static IModuleEndpoints Endpoints() => new NotificationEndpoints();

    public static Task MigrateNotificationsAsync(this IServiceProvider sp) => sp.MigrateAsync<NotificationsDbContext>();
}
