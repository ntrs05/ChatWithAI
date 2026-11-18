using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nebula.Audit.Api;
using Nebula.Audit.Application;
using Nebula.Audit.Infrastructure;
using Nebula.Shared.Contracts;
using Nebula.Shared.Infrastructure;

namespace Nebula.Audit;

public static class AuditModule
{
    public static IServiceCollection AddAuditModule(this IServiceCollection services, IConfiguration cfg)
    {
        services.AddModuleDbContext<AuditDbContext>(cfg, "audit");
        services.AddScoped<IAuditUnitOfWork>(sp => sp.GetRequiredService<AuditDbContext>());
        services.AddScoped<IAuditRepository, EfAuditRepository>();
        services.AddScoped<AuditService>();

        services.AddEventHandler<UserRegistered, AuditEventHandler>();
        services.AddEventHandler<UserLocked, AuditEventHandler>();
        services.AddEventHandler<UserUnlocked, AuditEventHandler>();
        services.AddEventHandler<ServerCreated, AuditEventHandler>();
        services.AddEventHandler<ServerDeleted, AuditEventHandler>();
        services.AddEventHandler<MemberAddedToServer, AuditEventHandler>();
        services.AddEventHandler<MemberRemovedFromServer, AuditEventHandler>();
        services.AddEventHandler<MemberRoleChanged, AuditEventHandler>();
        services.AddEventHandler<SystemSettingChanged, AuditEventHandler>();
        services.AddEventHandler<StorageQuotaChanged, AuditEventHandler>();
        return services;
    }

    public static IModuleEndpoints Endpoints() => new AuditEndpoints();

    public static Task MigrateAuditAsync(this IServiceProvider sp) => sp.MigrateAsync<AuditDbContext>();
}
