using Nebula.Identity.Domain;

namespace Nebula.Identity.Application;

public interface IIdentityUnitOfWork : Nebula.Shared.Kernel.IUnitOfWork { }

// Những interface này do Application ĐỊNH NGHĨA, Infrastructure HIỆN THỰC.
// Nhờ vậy nghiệp vụ không biết EF Core, Google hay JWT, và có thể test bằng đối tượng giả.
public interface IUserRepository
{
    /// <summary>Lấy user kèm Settings.</summary>
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<User>> GetByIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct);
    Task<User?> GetByEmailAsync(string email, CancellationToken ct);
    /// <summary>Tìm theo tên hiển thị + ID (phải khớp cả hai).</summary>
    Task<User?> FindByTagAsync(string displayName, string userCode, CancellationToken ct);
    /// <summary>Đã có người (khác exceptUserId) dùng đúng cặp tên + ID này chưa.</summary>
    Task<bool> TagTakenAsync(string displayName, string userCode, Guid? exceptUserId, CancellationToken ct);
    /// <summary>Danh sách cho admin hệ thống, lọc theo từ khóa và trạng thái khóa.</summary>
    Task<IReadOnlyList<User>> ListAsync(string? keyword, bool? locked, CancellationToken ct);
    /// <summary>Tìm theo tên hoặc email, bỏ qua tài khoản bị khóa.</summary>
    Task<IReadOnlyList<User>> SearchAsync(string keyword, int take, CancellationToken ct);
    Task AddAsync(User user, CancellationToken ct);
}

public sealed record GoogleIdentity(string Subject, string Email, string Name, string? Picture);

public interface IGoogleTokenValidator
{
    Task<GoogleIdentity?> ValidateAsync(string idToken, CancellationToken ct);
}

public interface ITokenService
{
    string CreateAccessToken(User user);
}

/// <summary>Băm / kiểm tra mật khẩu. Application không biết thuật toán cụ thể.</summary>
public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string hash);
}

/// <summary>Email nào là admin hệ thống (đọc từ ADMIN_EMAILS trong .env).</summary>
public interface IAdminPolicy
{
    bool IsAdminEmail(string email);
}
