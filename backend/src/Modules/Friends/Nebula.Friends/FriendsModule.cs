using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nebula.Friends.Api;
using Nebula.Shared.Infrastructure;

namespace Nebula.Friends;

// TV-Friends làm module này (UC04). Host chỉ gọi hai hàm dưới.
public static class FriendsModule
{
    public static IServiceCollection AddFriendsModule(this IServiceCollection services, IConfiguration cfg)
    {
        // TODO: đăng ký service của module. Viết xong lớp nào thì mở comment dòng tương ứng:
        //   services.AddModuleDbContext<FriendsDbContext>(cfg, "friends");
        //   services.AddScoped<IFriendsUnitOfWork>(sp => sp.GetRequiredService<FriendsDbContext>());
        //   services.AddScoped<IFriendshipRepository, EfFriendshipRepository>();
        //   services.AddScoped<FriendService>();
        //   services.AddScoped<IFriendsApi, FriendsApi>();
        //   services.AddEventHandler<FriendRequestSent, FriendRealtimeHandler>();
        //   services.AddEventHandler<FriendRequestAccepted, FriendRealtimeHandler>();
        //   services.AddEventHandler<FriendshipEnded, FriendRealtimeHandler>();
        return services;
    }

    public static IModuleEndpoints Endpoints() => new FriendEndpoints();

    // Có migration rồi thì thêm hàm này cho Host gọi:
    //   public static Task MigrateFriendsAsync(this IServiceProvider sp) => sp.MigrateAsync<...DbContext>();
}
