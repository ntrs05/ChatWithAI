namespace Nebula.Shared.Contracts;

/// <summary>Quyền của một người trong một server, do Organization tính và trả lời cho module khác.</summary>
/// <param name="Role">Owner / Moderator / Member, null nếu không phải thành viên.</param>
/// <param name="CanRead">Đọc / gửi tin trong các kênh của server (chỉ thành viên).</param>
/// <param name="CanModerate">Xóa tin người khác, ghim tin (chủ server / quản trị viên).</param>
/// <param name="CanManage">Tạo/sửa/xóa kênh và category (chủ server).</param>
public sealed record ServerAccess(bool Exists, string? Role, bool CanRead, bool CanModerate, bool CanManage)
{
    public static readonly ServerAccess None = new(false, null, false, false, false);
}

/// <summary>Cổng để Messaging hỏi Organization về server (Messaging không đọc bảng của Organization).</summary>
public interface IOrganizationApi
{
    Task<ServerAccess> GetAccessAsync(Guid serverId, Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<Guid>> GetMemberIdsAsync(Guid serverId, CancellationToken ct = default);
    /// <summary>Các server người này đọc được (để tìm kiếm tin nhắn).</summary>
    Task<IReadOnlyList<Guid>> GetReadableServerIdsAsync(Guid userId, CancellationToken ct = default);
}
