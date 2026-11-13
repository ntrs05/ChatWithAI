using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nebula.Organization.Api;
using Nebula.Shared.Infrastructure;

namespace Nebula.Organization;

// TV-Organization làm module này (UC05, UC15, UC16, UC18, UC20, UC21). Host chỉ gọi hai hàm dưới.
public static class OrganizationModule
{
    public static IServiceCollection AddOrganizationModule(this IServiceCollection services, IConfiguration cfg)
    {
        // TODO: đăng ký service của module. Viết xong lớp nào thì mở comment dòng tương ứng:
        //   services.AddModuleDbContext<OrganizationDbContext>(cfg, "organization");
        //   services.AddScoped<IOrganizationUnitOfWork>(sp => sp.GetRequiredService<OrganizationDbContext>());
        //   services.AddScoped<IServerRepository, EfServerRepository>();
        //   services.AddScoped<IJoinRequestRepository, EfJoinRequestRepository>();
        //   services.AddScoped<ISettingRepository, EfSettingRepository>();
        //   services.AddScoped<ServerService>();
        //   services.AddScoped<JoinRequestService>();
        //   services.AddScoped<SettingsService>();
        //   services.AddScoped<IOrganizationApi, OrganizationQueries>();
        return services;
    }

    public static IModuleEndpoints Endpoints() => new OrganizationEndpoints();

    // Có migration rồi thì thêm hàm này cho Host gọi:
    //   public static Task MigrateOrganizationAsync(this IServiceProvider sp) => sp.MigrateAsync<...DbContext>();
}
