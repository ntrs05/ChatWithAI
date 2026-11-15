using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nebula.Media.Api;
using Nebula.Media.Application;
using Nebula.Media.Infrastructure;
using Nebula.Shared.Contracts;
using Nebula.Shared.Infrastructure;

namespace Nebula.Media;

public static class MediaModule
{
    private const long Mb = 1024 * 1024;

    public static IServiceCollection AddMediaModule(this IServiceCollection services, IConfiguration cfg)
    {
        services.AddModuleDbContext<MediaDbContext>(cfg, "media");
        services.AddScoped<IMediaUnitOfWork>(sp => sp.GetRequiredService<MediaDbContext>());
        services.AddScoped<IStoredFileRepository, EfStoredFileRepository>();
        services.AddSingleton<IFileStore>(new LocalDiskFileStore(cfg["Storage:Path"] ?? "uploads"));
        services.AddSingleton(new MediaOptions(
            MaxFileBytes: cfg.GetValue("Storage:MaxFileMb", 25L) * Mb,
            QuotaBytes: cfg.GetValue("Storage:QuotaMb", 1024L) * Mb));
        services.AddScoped<MediaService>();
        services.AddScoped<IMediaApi, MediaApi>();
        return services;
    }

    public static IModuleEndpoints Endpoints() => new MediaEndpoints();

    public static Task MigrateMediaAsync(this IServiceProvider sp) => sp.MigrateAsync<MediaDbContext>();
}
