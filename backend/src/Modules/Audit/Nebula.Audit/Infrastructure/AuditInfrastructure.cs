using Microsoft.EntityFrameworkCore;

namespace Nebula.Audit.Infrastructure;

// TODO: bảng audit_logs (tên như ERD)
//       xong thì chạy dotnet ef migrations add InitialCreate
public sealed class AuditDbContext(DbContextOptions<AuditDbContext> options) : DbContext(options)
{
}

// TODO: AddAsync, SearchAsync
internal sealed class EfAuditRepository
{
}
