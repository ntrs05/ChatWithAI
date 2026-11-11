namespace Nebula.Media.Application;

public interface IMediaUnitOfWork
{
}

public interface IStoredFileRepository
{
}

public interface IFileStore
{
}

// TODO: các trường (long MaxFileBytes, long QuotaBytes)
public sealed record MediaOptions
{
}

// TODO: các trường (Guid Id, string FileName, string ContentType, long SizeBytes, string Url, DateTime CreatedAt)
//       From
public sealed record FileDto
{
}

// TODO: các trường (string Url)
public sealed record AvatarDto
{
}

// TODO: các trường (long UsedBytes, long LimitBytes, long MaxFileBytes)
public sealed record QuotaDto
{
}

// TODO: request gồm (long QuotaMb)
public sealed record SetQuotaRequest
{
}

// TODO: UploadAsync, UploadAvatarAsync, OpenAvatarAsync, ListMineAsync, GetQuotaAsync
//       SetQuotaAsync, OpenAsync, DeleteAsync
public sealed class MediaService
{
}
