using Microsoft.EntityFrameworkCore;

namespace Nebula.Organization.Infrastructure;

// TODO: bảng org_servers, org_server_members, org_server_bans, org_join_requests, org_settings (tên như ERD)
//       xong thì chạy dotnet ef migrations add InitialCreate
public sealed class OrganizationDbContext(DbContextOptions<OrganizationDbContext> options) : DbContext(options)
{
}
