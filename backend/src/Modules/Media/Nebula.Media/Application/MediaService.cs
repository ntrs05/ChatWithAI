using Nebula.Media.Domain;
using Nebula.Shared.Contracts;
using Nebula.Shared.Kernel;

namespace Nebula.Media.Application;

public interface IMediaUnitOfWork : IUnitOfWork { }

public interface IStoredFileRepository
{
    Task<StoredFile?> GetAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<StoredFile>> ListByOwnerAsync(Guid ownerId, CancellationToken ct);
    Task<IReadOnlyList<StoredFile>> GetOwnedAsync(Guid ownerId, IReadOnlyCollection<Guid> ids, CancellationToken ct);
    // tính thẳng từ DB
    Task<long> SumSizeAsync(Guid ownerId, CancellationToken ct);
    Task AddAsync(StoredFile file, CancellationToken ct);
    void Remove(StoredFile file);

    // null = dùng hạn mức mặc định
    Task<StorageQuota?> GetQuotaAsync(Guid userId, CancellationToken ct);
    Task AddQuotaAsync(StorageQuota quota, CancellationToken ct);
}

// lưu file ra ổ đĩa, sau này muốn đổi sang S3 thì viết lớp khác
public interface IFileStore
{
    Task SaveAsync(string key, Stream content, CancellationToken ct);
    Stream? OpenRead(string key);
    void Delete(string key);
}

public sealed record MediaOptions(long MaxFileBytes, long QuotaBytes);

public sealed record FileDto(Guid Id, string FileName, string ContentType, long SizeBytes, string Url, DateTime CreatedAt)
{
    public static FileDto From(StoredFile f) => new(f.Id, f.FileName, f.ContentType, f.SizeBytes, f.Url, f.CreatedAt);
}

public sealed record AvatarDto(string Url);
public sealed record QuotaDto(long UsedBytes, long LimitBytes, long MaxFileBytes);
public sealed record SetQuotaRequest(long QuotaMb);

public sealed class MediaService(IStoredFileRepository files, IFileStore store, IMediaUnitOfWork uow, MediaOptions options, IEventBus bus)
{
    private const long Mb = 1024 * 1024;
    private static readonly Error NotFound = Error.NotFound("File.NotFound", "Không tìm thấy file.");

    private async Task<long> LimitOfAsync(Guid userId, CancellationToken ct)
        => (await files.GetQuotaAsync(userId, ct))?.QuotaBytes ?? options.QuotaBytes;

    public async Task<Result<FileDto>> UploadAsync(Guid ownerId, string fileName, string? contentType, long length, Stream content, CancellationToken ct)
    {
        if (length > options.MaxFileBytes)
            return new Error("File.TooLarge", $"File tối đa {options.MaxFileBytes / Mb} MB.");

        // check hạn mức dung lượng
        var used = await files.SumSizeAsync(ownerId, ct);
        var limit = await LimitOfAsync(ownerId, ct);
        if (used + length > limit)
            return Error.Conflict("File.QuotaExceeded", $"Hết dung lượng: đã dùng {used / Mb} MB / {limit / Mb} MB. Hãy xóa bớt file.");

        var created = StoredFile.Create(ownerId, fileName, contentType, length);
        if (created.IsFailure) return created.Error;
        var file = created.Value;

        await store.SaveAsync(file.StorageKey, content, ct);
        try
        {
            await files.AddAsync(file, ct);
            await uow.SaveChangesAsync(ct);
        }
        catch
        {
            store.Delete(file.StorageKey);   // lưu DB lỗi thì xóa file vừa ghi
            throw;
        }
        return Result.Success(FileDto.From(file));
    }

    // lưu avatar mới rồi xóa avatar cũ
    public async Task<Result<AvatarDto>> UploadAvatarAsync(Guid ownerId, string fileName, string? contentType, long length, Stream content, CancellationToken ct)
    {
        var created = StoredFile.CreateAvatar(ownerId, fileName, contentType, length);
        if (created.IsFailure) return created.Error;

        // đọc vài byte đầu để chắc là ảnh thật
        var head = new byte[12];
        var read = 0;
        while (read < head.Length)
        {
            var n = await content.ReadAsync(head.AsMemory(read), ct);
            if (n == 0) break;
            read += n;
        }
        if (!StoredFile.LooksLikeImage(created.Value.ContentType, head.AsSpan(0, read)))
            return new Error("Avatar.NotAnImage", "Tệp không phải ảnh hợp lệ.");
        if (!content.CanSeek) return new Error("Avatar.NotSeekable", "Không đọc được tệp.");
        content.Position = 0;

        var file = created.Value;
        var used = await files.SumSizeAsync(ownerId, ct);
        var limit = await LimitOfAsync(ownerId, ct);
        if (used + length > limit) return Error.Conflict("File.QuotaExceeded", "Hết dung lượng, hãy xóa bớt file.");

        var old = (await files.ListByOwnerAsync(ownerId, ct)).Where(f => f.IsAvatar).ToList();
        await store.SaveAsync(file.StorageKey, content, ct);
        try
        {
            await files.AddAsync(file, ct);
            foreach (var o in old) { var tracked = await files.GetAsync(o.Id, ct); if (tracked is not null) files.Remove(tracked); }
            await uow.SaveChangesAsync(ct);
        }
        catch
        {
            store.Delete(file.StorageKey);
            throw;
        }
        foreach (var o in old) store.Delete(o.StorageKey);
        return Result.Success(new AvatarDto(file.Url));
    }

    // công khai nhưng chỉ avatar
    public async Task<Result<(StoredFile File, Stream Content)>> OpenAvatarAsync(Guid fileId, CancellationToken ct)
    {
        var file = await files.GetAsync(fileId, ct);
        if (file is null || !file.IsAvatar) return NotFound;
        var stream = store.OpenRead(file.StorageKey);
        return stream is null ? NotFound : Result.Success((file, stream));
    }

    public async Task<IReadOnlyList<FileDto>> ListMineAsync(Guid ownerId, CancellationToken ct)
        => (await files.ListByOwnerAsync(ownerId, ct)).Select(FileDto.From).ToList();

    public async Task<QuotaDto> GetQuotaAsync(Guid userId, CancellationToken ct)
        => new(await files.SumSizeAsync(userId, ct), await LimitOfAsync(userId, ct), options.MaxFileBytes);

    public async Task<Result<QuotaDto>> SetQuotaAsync(Guid actorId, Guid userId, long quotaMb, CancellationToken ct)
    {
        if (quotaMb is < 1 or > 1024 * 1024) return new Error("Quota.Invalid", "Hạn mức phải từ 1 MB đến 1 TB.");
        var quota = await files.GetQuotaAsync(userId, ct);
        if (quota is null) await files.AddQuotaAsync(StorageQuota.Create(userId, quotaMb * Mb, actorId), ct);
        else quota.Update(quotaMb * Mb, actorId);
        await uow.SaveChangesAsync(ct);
        await bus.PublishAsync(new StorageQuotaChanged(userId, quotaMb * Mb, actorId), ct);
        return Result.Success(await GetQuotaAsync(userId, ct));
    }

    public async Task<Result<(StoredFile File, Stream Content)>> OpenAsync(Guid fileId, CancellationToken ct)
    {
        var file = await files.GetAsync(fileId, ct);
        if (file is null) return NotFound;
        var stream = store.OpenRead(file.StorageKey);
        return stream is null ? NotFound : Result.Success((file, stream));
    }

    public async Task<Result> DeleteAsync(Guid ownerId, Guid fileId, CancellationToken ct)
    {
        var file = await files.GetAsync(fileId, ct);
        if (file is null) return Result.Failure(NotFound);
        if (file.OwnerId != ownerId) return Result.Failure(Error.Forbidden("File.NotOwner", "Chỉ người upload mới được xóa file."));
        files.Remove(file);
        await uow.SaveChangesAsync(ct);
        store.Delete(file.StorageKey);
        return Result.Success();
    }
}
