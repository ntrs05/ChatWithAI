namespace Nebula.Shared.Contracts;

public sealed record MediaFileInfo(Guid Id, Guid OwnerId, string FileName, string ContentType, long SizeBytes, string Url);

public interface IMediaApi
{
    Task<IReadOnlyList<MediaFileInfo>> GetOwnedFilesAsync(Guid ownerId, IReadOnlyCollection<Guid> fileIds, CancellationToken ct = default);
}
