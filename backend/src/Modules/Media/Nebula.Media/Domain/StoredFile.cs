using Nebula.Shared.Kernel;

namespace Nebula.Media.Domain;

public sealed class StoredFile : Entity
{
    // chặn file chạy được
    private static readonly string[] BlockedExtensions = [".exe", ".bat", ".cmd", ".msi", ".ps1", ".sh"];

    private StoredFile() { }
    public Guid OwnerId { get; private set; }
    public string FileName { get; private set; } = "";
    public string ContentType { get; private set; } = "";
    public long SizeBytes { get; private set; }
    public string StorageKey { get; private set; } = "";

    public string Url => IsAvatar ? $"/api/avatars/{Id}" : $"/api/files/{Id}";

    // avatar nằm trong thư mục này, xem công khai
    public const string AvatarPrefix = "avatars/";
    public const long MaxAvatarBytes = 20 * 1024 * 1024;
    public bool IsAvatar => StorageKey.StartsWith(AvatarPrefix, StringComparison.Ordinal);
    private static readonly string[] AvatarTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];

    // không cho svg vì có thể chứa script
    public static Result<StoredFile> CreateAvatar(Guid ownerId, string fileName, string? contentType, long sizeBytes)
    {
        var type = (contentType ?? "").ToLowerInvariant();
        if (!AvatarTypes.Contains(type)) return new Error("Avatar.InvalidType", "Ảnh đại diện phải là PNG, JPEG, WebP hoặc GIF.");
        if (sizeBytes > MaxAvatarBytes) return new Error("Avatar.TooLarge", "Ảnh đại diện tối đa 20 MB.");
        var created = Create(ownerId, string.IsNullOrWhiteSpace(fileName) ? "avatar" : fileName, type, sizeBytes);
        if (created.IsFailure) return created;
        created.Value.StorageKey = $"{AvatarPrefix}{ownerId:N}/{created.Value.Id:N}";
        return created;
    }

    // không tin content-type client gửi, check byte đầu
    public static bool LooksLikeImage(string contentType, ReadOnlySpan<byte> head) => contentType.ToLowerInvariant() switch
    {
        "image/png" => head.StartsWith(new byte[] { 0x89, 0x50, 0x4E, 0x47 }),
        "image/jpeg" => head.StartsWith(new byte[] { 0xFF, 0xD8, 0xFF }),
        "image/gif" => head.StartsWith("GIF8"u8),
        "image/webp" => head.Length >= 12 && head[..4].SequenceEqual("RIFF"u8) && head.Slice(8, 4).SequenceEqual("WEBP"u8),
        _ => false
    };

    public static Result<StoredFile> Create(Guid ownerId, string fileName, string? contentType, long sizeBytes)
    {
        fileName = Path.GetFileName(fileName ?? "").Trim();
        if (fileName.Length == 0 || fileName.Length > 255) return new Error("File.InvalidName", "Tên file phải từ 1 đến 255 ký tự.");
        if (sizeBytes <= 0) return new Error("File.Empty", "File rỗng.");

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (BlockedExtensions.Contains(ext)) return new Error("File.Blocked", $"Không cho phép gửi file {ext}.");

        var file = new StoredFile
        {
            OwnerId = ownerId,
            FileName = fileName,
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            SizeBytes = sizeBytes
        };
        // tên trên đĩa do server đặt
        file.StorageKey = $"{ownerId:N}/{file.Id:N}";
        return Result.Success(file);
    }
}

// hạn mức riêng của từng người, không có dòng thì dùng mặc định
public sealed class StorageQuota
{
    private StorageQuota() { }
    public Guid UserId { get; private set; }
    public long QuotaBytes { get; private set; }
    public Guid UpdatedBy { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    public static StorageQuota Create(Guid userId, long quotaBytes, Guid updatedBy)
        => new() { UserId = userId, QuotaBytes = quotaBytes, UpdatedBy = updatedBy, UpdatedAt = DateTime.UtcNow };

    public void Update(long quotaBytes, Guid updatedBy) { QuotaBytes = quotaBytes; UpdatedBy = updatedBy; UpdatedAt = DateTime.UtcNow; }
}
