namespace Nebula.Shared.Contracts;

public sealed record MediaFileInfo(Guid Id, Guid OwnerId, string FileName, string ContentType, long SizeBytes, string Url);

/// <summary>Cổng để module khác HỎI Media. Messaging dùng để kiểm tra file đính kèm có thật và đúng là của người gửi,
/// thay vì tin URL/kích thước do client tự khai.</summary>
public interface IMediaApi
{
    Task<IReadOnlyList<MediaFileInfo>> GetOwnedFilesAsync(Guid ownerId, IReadOnlyCollection<Guid> fileIds, CancellationToken ct = default);
}
