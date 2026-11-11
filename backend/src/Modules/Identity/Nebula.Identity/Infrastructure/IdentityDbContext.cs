using Microsoft.EntityFrameworkCore;

namespace Nebula.Identity.Infrastructure;

// TODO: bảng identity_users, identity_user_settings (tên như ERD)
//       xong thì chạy dotnet ef migrations add InitialCreate
public sealed class IdentityDbContext(DbContextOptions<IdentityDbContext> options) : DbContext(options)
{
}
