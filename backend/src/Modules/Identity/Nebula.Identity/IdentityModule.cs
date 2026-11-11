using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nebula.Identity.Api;
using Nebula.Identity.Application;
using Nebula.Identity.Infrastructure;
using Nebula.Shared.Contracts;
using Nebula.Shared.Infrastructure;

namespace Nebula.Identity;

/// <summary>Cửa duy nhất của module với Host. Host chỉ gọi 3 hàm này, không biết bên trong có gì.</summary>
public static class IdentityModule
{
    public static IServiceCollection AddIdentityModule(this IServiceCollection services, IConfiguration cfg)
    {
        services.AddModuleDbContext<IdentityDbContext>(cfg, "identity");
        services.AddScoped<IIdentityUnitOfWork>(sp => sp.GetRequiredService<IdentityDbContext>());
        services.AddMemoryCache();

        services.AddScoped<IUserRepository, EfUserRepository>();
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        services.AddSingleton<IGoogleTokenValidator, GoogleTokenValidator>();
        services.AddSingleton<IAdminPolicy, ConfigAdminPolicy>();
        services.AddScoped<IIdentityApi, IdentityApi>();

        services.AddScoped<UserTagService>();
        services.AddScoped<AuthService>();
        services.AddScoped<ProfileService>();
        services.AddScoped<AdminService>();

        services.AddEventHandler<UserConnected, UserConnectedHandler>();
        services.AddEventHandler<UserDisconnected, UserDisconnectedHandler>();
        return services;
    }

    public static IModuleEndpoints Endpoints() => new IdentityEndpoints();

    public static Task MigrateIdentityAsync(this IServiceProvider sp) => sp.MigrateAsync<IdentityDbContext>();
}
