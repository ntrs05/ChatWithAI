using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nebula.Audit.Api;
using Nebula.Shared.Infrastructure;

namespace Nebula.Audit;

// TV-Audit làm module này (UC22). Host chỉ gọi hai hàm dưới.
public static class AuditModule
{
    public static IServiceCollection AddAuditModule(this IServiceCollection services, IConfiguration cfg)
    {
        // TODO: đăng ký service của module. Viết xong lớp nào thì mở comment dòng tương ứng:
        //   services.AddModuleDbContext<AuditDbContext>(cfg, "audit");
        //   services.AddScoped<IAuditUnitOfWork>(sp => sp.GetRequiredService<AuditDbContext>());
        //   services.AddScoped<IAuditRepository, EfAuditRepository>();
        //   services.AddScoped<AuditService>();
        //   services.AddEventHandler<UserRegistered, AuditEventHandler>();
        //   services.AddEventHandler<UserLocked, AuditEventHandler>();
        //   services.AddEventHandler<UserUnlocked, AuditEventHandler>();
        //   services.AddEventHandler<ServerCreated, AuditEventHandler>();
        //   services.AddEventHandler<ServerDeleted, AuditEventHandler>();
        //   services.AddEventHandler<MemberAddedToServer, AuditEventHandler>();
        //   services.AddEventHandler<MemberRemovedFromServer, AuditEventHandler>();
        //   services.AddEventHandler<MemberRoleChanged, AuditEventHandler>();
        //   services.AddEventHandler<SystemSettingChanged, AuditEventHandler>();
        //   services.AddEventHandler<StorageQuotaChanged, AuditEventHandler>();
        return services;
    }

    public static IModuleEndpoints Endpoints() => new AuditEndpoints();

    // Có migration rồi thì thêm hàm này cho Host gọi:
    //   public static Task MigrateAuditAsync(this IServiceProvider sp) => sp.MigrateAsync<...DbContext>();
}
