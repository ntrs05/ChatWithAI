using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nebula.Media.Api;
using Nebula.Shared.Infrastructure;

namespace Nebula.Media;

// TV-Media làm module này (UC09, UC20 (hạn mức)). Host chỉ gọi hai hàm dưới.
public static class MediaModule
{
    public static IServiceCollection AddMediaModule(this IServiceCollection services, IConfiguration cfg)
    {
        // TODO: đăng ký service của module. Viết xong lớp nào thì mở comment dòng tương ứng:
        //   services.AddModuleDbContext<MediaDbContext>(cfg, "media");
        //   services.AddScoped<IMediaUnitOfWork>(sp => sp.GetRequiredService<MediaDbContext>());
        //   services.AddScoped<IStoredFileRepository, EfStoredFileRepository>();
        //   services.AddSingleton<IFileStore>(new LocalDiskFileStore(cfg["Storage:Path"] ?? "uploads"));
        //   services.AddSingleton(new MediaOptions(
        //   MaxFileBytes: cfg.GetValue("Storage:MaxFileMb", 25L) * Mb,
        //   QuotaBytes: cfg.GetValue("Storage:QuotaMb", 1024L) * Mb));
        //   services.AddScoped<MediaService>();
        //   services.AddScoped<IMediaApi, MediaApi>();
        return services;
    }

    public static IModuleEndpoints Endpoints() => new MediaEndpoints();

    // Có migration rồi thì thêm hàm này cho Host gọi:
    //   public static Task MigrateMediaAsync(this IServiceProvider sp) => sp.MigrateAsync<...DbContext>();
}
