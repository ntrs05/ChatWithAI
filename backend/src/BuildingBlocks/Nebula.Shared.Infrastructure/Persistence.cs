using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Nebula.Shared.Infrastructure;

public static class PersistenceExtensions
{
    private static readonly MySqlServerVersion MySqlVersion = new(new Version(8, 0, 36));

    public static IServiceCollection AddModuleDbContext<TContext>(this IServiceCollection services, IConfiguration cfg, string moduleName)
        where TContext : DbContext
    {
        var connectionString = cfg.GetConnectionString("Default");
        return services.AddDbContext<TContext>(o => o
            .UseMySql(connectionString, MySqlVersion, my => my.MigrationsHistoryTable($"__ef_history_{moduleName}"))
            // Lệch nhỏ giữa model và ModelSnapshot chỉ nên cảnh báo, không được làm API không khởi động được.
            .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning)));
    }

    public static async Task MigrateAsync<TContext>(this IServiceProvider sp) where TContext : DbContext
    {
        using var scope = sp.CreateScope();
        await scope.ServiceProvider.GetRequiredService<TContext>().Database.MigrateAsync();
    }
}
