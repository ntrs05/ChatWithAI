using Microsoft.EntityFrameworkCore;
using Nebula.Media.Application;
using Nebula.Media.Domain;
using Nebula.Shared.Contracts;

namespace Nebula.Media.Infrastructure;

public sealed class MediaDbContext(DbContextOptions<MediaDbContext> options) : DbContext(options), IMediaUnitOfWork
{
    public DbSet<StoredFile> Files => Set<StoredFile>();
    public DbSet<StorageQuota> Quotas => Set<StorageQuota>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<StoredFile>(e =>
        {
            e.ToTable("media_files");
            e.HasIndex(x => x.OwnerId);
            e.Property(x => x.FileName).HasMaxLength(255).IsRequired();
            e.Property(x => x.ContentType).HasMaxLength(100).IsRequired();
            e.Property(x => x.StorageKey).HasMaxLength(200).IsRequired();
            e.Ignore(x => x.Url);
        });
        b.Entity<StorageQuota>(e =>
        {
            e.ToTable("media_quotas");
            e.HasKey(x => x.UserId);
        });
    }
}

internal sealed class EfStoredFileRepository(MediaDbContext db) : IStoredFileRepository
{
    public Task<StoredFile?> GetAsync(Guid id, CancellationToken ct) => db.Files.FirstOrDefaultAsync(f => f.Id == id, ct);

    public async Task<IReadOnlyList<StoredFile>> ListByOwnerAsync(Guid ownerId, CancellationToken ct)
        => await db.Files.AsNoTracking().Where(f => f.OwnerId == ownerId).OrderByDescending(f => f.CreatedAt).ToListAsync(ct);

    public async Task<IReadOnlyList<StoredFile>> GetOwnedAsync(Guid ownerId, IReadOnlyCollection<Guid> ids, CancellationToken ct)
        => await db.Files.AsNoTracking().Where(f => f.OwnerId == ownerId && ids.Contains(f.Id)).ToListAsync(ct);

    public Task<long> SumSizeAsync(Guid ownerId, CancellationToken ct)
        => db.Files.Where(f => f.OwnerId == ownerId).SumAsync(f => f.SizeBytes, ct);

    public async Task AddAsync(StoredFile file, CancellationToken ct) => await db.Files.AddAsync(file, ct);
    public void Remove(StoredFile file) => db.Files.Remove(file);

    public Task<StorageQuota?> GetQuotaAsync(Guid userId, CancellationToken ct) => db.Quotas.FirstOrDefaultAsync(q => q.UserId == userId, ct);
    public async Task AddQuotaAsync(StorageQuota quota, CancellationToken ct) => await db.Quotas.AddAsync(quota, ct);
}

// trong docker thư mục này là volume
internal sealed class LocalDiskFileStore(string rootPath) : IFileStore
{
    public async Task SaveAsync(string key, Stream content, CancellationToken ct)
    {
        var path = Path.Combine(rootPath, key);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await using var file = File.Create(path);
        await content.CopyToAsync(file, ct);
    }

    public Stream? OpenRead(string key)
    {
        var path = Path.Combine(rootPath, key);
        return File.Exists(path) ? File.OpenRead(path) : null;
    }

    public void Delete(string key)
    {
        var path = Path.Combine(rootPath, key);
        if (File.Exists(path)) File.Delete(path);
    }
}

// cho module khác check file đính kèm
internal sealed class MediaApi(IStoredFileRepository files) : IMediaApi
{
    public async Task<IReadOnlyList<MediaFileInfo>> GetOwnedFilesAsync(Guid ownerId, IReadOnlyCollection<Guid> fileIds, CancellationToken ct = default)
        => (await files.GetOwnedAsync(ownerId, fileIds, ct))
            .Select(f => new MediaFileInfo(f.Id, f.OwnerId, f.FileName, f.ContentType, f.SizeBytes, f.Url)).ToList();
}
