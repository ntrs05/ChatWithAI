using Microsoft.EntityFrameworkCore;

namespace Nebula.Media.Infrastructure;

// TODO: bảng media_files, media_quotas (tên như ERD)
//       xong thì chạy dotnet ef migrations add InitialCreate
public sealed class MediaDbContext(DbContextOptions<MediaDbContext> options) : DbContext(options)
{
}

// TODO: GetAsync, ListByOwnerAsync, GetOwnedAsync, SumSizeAsync, AddAsync, Remove, GetQuotaAsync
//       AddQuotaAsync
internal sealed class EfStoredFileRepository
{
}

// TODO: SaveAsync, OpenRead, Delete
internal sealed class LocalDiskFileStore
{
}

// TODO: GetOwnedFilesAsync
internal sealed class MediaApi
{
}
