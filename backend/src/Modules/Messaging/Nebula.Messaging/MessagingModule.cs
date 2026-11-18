using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nebula.Messaging.Api;
using Nebula.Messaging.Application;
using Nebula.Messaging.Infrastructure;
using Nebula.Shared.Contracts;
using Nebula.Shared.Infrastructure;

namespace Nebula.Messaging;

public static class MessagingModule
{
    public static IServiceCollection AddMessagingModule(this IServiceCollection services, IConfiguration cfg)
    {
        services.AddModuleDbContext<MessagingDbContext>(cfg, "messaging");
        services.AddScoped<IMessagingUnitOfWork>(sp => sp.GetRequiredService<MessagingDbContext>());
        services.AddScoped<IConversationRepository, EfConversationRepository>();
        services.AddScoped<IMessageRepository, EfMessageRepository>();

        services.AddScoped<ConversationAccess>();
        services.AddScoped<ChannelService>();
        services.AddScoped<DirectService>();
        services.AddScoped<MessageService>();
        services.AddScoped<MessageDtoFactory>();
        services.AddScoped<IMessagingApi, MessagingApi>();
        services.AddScoped<VoiceService>();
        services.AddScoped<VoiceTokenService>();
        services.AddSingleton<IVoiceStateStore, InMemoryVoiceStateStore>();

        // hub nằm ở Messaging nên hiện thực IRealtimeGateway ở đây
        services.AddSingleton<PresenceTracker>();
        services.AddSingleton<IUserIdProvider, SubUserIdProvider>();
        services.AddSingleton<IRealtimeGateway, SignalRGateway>();

        services.AddEventHandler<MessageSent, PushMessageHandler>();
        services.AddEventHandler<MessageChanged, PushMessageChangedHandler>();
        services.AddEventHandler<UserStatusChanged, PushStatusHandler>();
        services.AddEventHandler<UserProfileChanged, PushProfileHandler>();
        services.AddEventHandler<ServerCreated, ServerCreatedHandler>();
        services.AddEventHandler<ServerDeleted, ServerDeletedHandler>();
        services.AddEventHandler<MemberAddedToServer, ServerMembershipRealtimeHandler>();
        services.AddEventHandler<MemberRemovedFromServer, ServerMembershipRealtimeHandler>();
        services.AddEventHandler<UserLocked, UserLockedHandler>();
        services.AddEventHandler<ChannelCreated, ChannelCreatedRealtimeHandler>();
        services.AddEventHandler<ChannelRemoved, ChannelRemovedRealtimeHandler>();
        services.AddEventHandler<MemberRoleChanged, OwnerPrivateChannelsHandler>();
        services.AddEventHandler<UserDisconnected, VoiceCleanupHandler>();
        services.AddEventHandler<MemberRemovedFromServer, VoiceCleanupHandler>();
        services.AddEventHandler<ServerDeleted, VoiceCleanupHandler>();
        return services;
    }

    public static IModuleEndpoints Endpoints() => new MessagingEndpoints();

    public static Task MigrateMessagingAsync(this IServiceProvider sp) => sp.MigrateAsync<MessagingDbContext>();
}
