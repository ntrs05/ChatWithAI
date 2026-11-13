namespace Nebula.Shared.Contracts;

/// <param name="Username">Tên rút gọn hiển thị dạng @username (phần trước @ của email).</param>
public sealed record UserSummary(Guid Id, string DisplayName, string? AvatarUrl, bool IsLocked, bool IsAdmin, bool TypingIndicatorEnabled, string Username = "", string Status = "Offline", string UserCode = "");

/// <summary>Cửa duy nhất để module khác HỎI Identity (truy vấn cần câu trả lời ngay). Muốn báo tin thì dùng event.</summary>
public interface IIdentityApi
{
    Task<UserSummary?> GetUserAsync(Guid userId, CancellationToken ct = default);
    /// <summary>Tìm người theo TÊN hiển thị + ID 4 chữ số ("Nguyễn An#0042") — dùng cho "kết bạn bằng tên + ID".
    /// Phải khớp cả hai. Null nếu không có hoặc bị khóa.</summary>
    Task<UserSummary?> FindByTagAsync(string displayName, string userCode, CancellationToken ct = default);
    /// <summary>Lấy nhiều người cùng lúc (một truy vấn) để gắn tên/avatar vào danh sách thành viên, tin nhắn.</summary>
    Task<IReadOnlyDictionary<Guid, UserSummary>> GetUsersAsync(IReadOnlyCollection<Guid> userIds, CancellationToken ct = default);
    /// <summary>Tài khoản tồn tại và không bị khóa.</summary>
    Task<bool> IsActiveAsync(Guid userId, CancellationToken ct = default);
}
