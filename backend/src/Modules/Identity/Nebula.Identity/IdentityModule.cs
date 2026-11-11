using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nebula.Identity.Api;
using Nebula.Shared.Infrastructure;

namespace Nebula.Identity;

// TV-Identity làm module này (UC01, UC02, UC03, UC19). Host chỉ gọi hai hàm dưới.
public static class IdentityModule
{
    public static IServiceCollection AddIdentityModule(this IServiceCollection services, IConfiguration cfg)
    {
        // TODO: đăng ký service của module. Viết xong lớp nào thì mở comment dòng tương ứng:
        //   services.AddModuleDbContext<IdentityDbContext>(cfg, "identity");
        //   services.AddScoped<IIdentityUnitOfWork>(sp => sp.GetRequiredService<IdentityDbContext>());
        //   services.AddMemoryCache();
        //   services.AddScoped<IUserRepository, EfUserRepository>();
        //   services.AddSingleton<ITokenService, JwtTokenService>();
        //   services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        //   services.AddSingleton<IGoogleTokenValidator, GoogleTokenValidator>();
        //   services.AddSingleton<IAdminPolicy, ConfigAdminPolicy>();
        //   services.AddScoped<IIdentityApi, IdentityApi>();
        //   services.AddScoped<UserTagService>();
        //   services.AddScoped<AuthService>();
        //   services.AddScoped<ProfileService>();
        //   services.AddScoped<AdminService>();
        //   services.AddEventHandler<UserConnected, UserConnectedHandler>();
        //   services.AddEventHandler<UserDisconnected, UserDisconnectedHandler>();
        return services;
    }

    public static IModuleEndpoints Endpoints() => new IdentityEndpoints();

    // Có migration rồi thì thêm hàm này cho Host gọi:
    //   public static Task MigrateIdentityAsync(this IServiceProvider sp) => sp.MigrateAsync<...DbContext>();
}
