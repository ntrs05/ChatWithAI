using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nebula.Organization.Api;
using Nebula.Organization.Application;
using Nebula.Organization.Infrastructure;
using Nebula.Shared.Contracts;
using Nebula.Shared.Infrastructure;

namespace Nebula.Organization;

/// <summary>Module tổ chức: server, thành viên, chủ server/quản trị viên, lời mời, cài đặt hệ thống của admin hệ thống.</summary>
public static class OrganizationModule
{
    public static IServiceCollection AddOrganizationModule(this IServiceCollection services, IConfiguration cfg)
    {
        services.AddModuleDbContext<OrganizationDbContext>(cfg, "organization");
        services.AddScoped<IOrganizationUnitOfWork>(sp => sp.GetRequiredService<OrganizationDbContext>());
        services.AddScoped<IServerRepository, EfServerRepository>();
        services.AddScoped<IJoinRequestRepository, EfJoinRequestRepository>();
        services.AddScoped<ISettingRepository, EfSettingRepository>();

        services.AddScoped<ServerService>();
        services.AddScoped<JoinRequestService>();
        services.AddScoped<SettingsService>();
        services.AddScoped<IOrganizationApi, OrganizationQueries>();
        return services;
    }

    public static IModuleEndpoints Endpoints() => new OrganizationEndpoints();

    public static Task MigrateOrganizationAsync(this IServiceProvider sp) => sp.MigrateAsync<OrganizationDbContext>();
}
