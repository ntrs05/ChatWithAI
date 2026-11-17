using Nebula.Identity.Domain;

namespace Nebula.Identity.Application;

public sealed class UserTagService(IUserRepository users)
{
    public async Task AssignAsync(User user, CancellationToken ct)
    {
        for (var attempt = 0; attempt < 60; attempt++)
        {
            var code = User.NewUserCode();
            if (await users.TagTakenAsync(user.DisplayName, code, user.Id, ct)) continue;
            user.AssignUserCode(code);
            return;
        }
        // random không ra thì duyệt tuần tự
        for (var n = 0; n < 10_000; n++)
        {
            var code = n.ToString("D4");
            if (await users.TagTakenAsync(user.DisplayName, code, user.Id, ct)) continue;
            user.AssignUserCode(code);
            return;
        }
        throw new InvalidOperationException($"Tên \"{user.DisplayName}\" đã hết ID (0000–9999). Hãy chọn tên hiển thị khác.");
    }

    public async Task<bool> EnsureAsync(User user, CancellationToken ct)
    {
        if (user.HasUserCode) return false;
        await AssignAsync(user, ct);
        return true;
    }
}
