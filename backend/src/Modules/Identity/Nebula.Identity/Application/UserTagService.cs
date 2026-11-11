using Nebula.Identity.Domain;

namespace Nebula.Identity.Application;

/// <summary>Cấp / giữ ID 4 chữ số cho người dùng. ID chỉ cần khác nhau giữa những người CÙNG tên hiển thị.</summary>
public sealed class UserTagService(IUserRepository users)
{
    /// <summary>Cấp một ID chưa ai cùng tên dùng. Một tên chỉ có tối đa 10.000 ID (0000–9999); hết thì phải đổi tên khác.</summary>
    public async Task AssignAsync(User user, CancellationToken ct)
    {
        for (var attempt = 0; attempt < 60; attempt++)
        {
            var code = User.NewUserCode();
            if (await users.TagTakenAsync(user.DisplayName, code, user.Id, ct)) continue;
            user.AssignUserCode(code);
            return;
        }
        // Thử ngẫu nhiên không ra (tên rất đông người): duyệt tuần tự.
        for (var n = 0; n < 10_000; n++)
        {
            var code = n.ToString("D4");
            if (await users.TagTakenAsync(user.DisplayName, code, user.Id, ct)) continue;
            user.AssignUserCode(code);
            return;
        }
        throw new InvalidOperationException($"Tên \"{user.DisplayName}\" đã hết ID (0000–9999). Hãy chọn tên hiển thị khác.");
    }

    /// <summary>Người dùng cũ (hoặc dữ liệu thiếu ID) mà chưa có ID hợp lệ thì cấp bù. Trả về true nếu vừa cấp (cần lưu).</summary>
    public async Task<bool> EnsureAsync(User user, CancellationToken ct)
    {
        if (user.HasUserCode) return false;
        await AssignAsync(user, ct);
        return true;
    }
}
