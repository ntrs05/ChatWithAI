using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nebula.Friends.Api;
using Nebula.Friends.Application;
using Nebula.Friends.Infrastructure;
using Nebula.Shared.Contracts;
using Nebula.Shared.Infrastructure;

namespace Nebula.Friends;

public static class FriendsModule
{
    public static IServiceCollection AddFriendsModule(this IServiceCollection services, IConfiguration cfg)
    {
        services.AddModuleDbContext<FriendsDbContext>(cfg, "friends");
        services.AddScoped<IFriendsUnitOfWork>(sp => sp.GetRequiredService<FriendsDbContext>());
        services.AddScoped<IFriendshipRepository, EfFriendshipRepository>();
        services.AddScoped<FriendService>();
        services.AddScoped<IFriendsApi, FriendsApi>();

        services.AddEventHandler<FriendRequestSent, FriendRealtimeHandler>();
        services.AddEventHandler<FriendRequestAccepted, FriendRealtimeHandler>();
        services.AddEventHandler<FriendshipEnded, FriendRealtimeHandler>();
        return services;
    }

    public static IModuleEndpoints Endpoints() => new FriendEndpoints();

    public static Task MigrateFriendsAsync(this IServiceProvider sp) => sp.MigrateAsync<FriendsDbContext>();
}
