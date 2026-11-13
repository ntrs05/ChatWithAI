using Nebula.Identity.Domain;
using Nebula.Shared.Contracts;
using Nebula.Shared.Kernel;

namespace Nebula.Identity.Application;

public sealed record UpdateProfileRequest(string DisplayName, string? AvatarUrl, string? CoverUrl, string? Bio, string? Phone);
public sealed record UserSettingsRequest(bool TypingIndicatorEnabled);
/// <param name="CurrentPassword">Bắt buộc nếu tài khoản đã có mật khẩu; tài khoản chỉ đăng nhập Google (chưa có mật khẩu) thì bỏ trống.</param>
public sealed record ChangePasswordRequest(string? CurrentPassword, string NewPassword);

public sealed class ProfileService(IUserRepository users, IPasswordHasher hasher, UserTagService tags, IIdentityUnitOfWork uow, IEventBus bus, Microsoft.Extensions.Caching.Memory.IMemoryCache cache)
{
    private static readonly Error NotFound = Error.NotFound("User.NotFound", "Không tìm thấy người dùng.");

    public async Task<Result<UserDto>> GetAsync(Guid userId, CancellationToken ct)
    {
        var user = await users.GetByIdAsync(userId, ct);
        if (user is null) return NotFound;
        if (await tags.EnsureAsync(user, ct)) await uow.SaveChangesAsync(ct);   // tài khoản cũ thiếu ID → cấp bù ngay khi mở app
        return Result.Success(UserDto.From(user));
    }

    /// <summary>Xem hồ sơ người khác (không lộ email, số điện thoại).</summary>
    public async Task<Result<PublicUserDto>> GetPublicAsync(Guid userId, CancellationToken ct)
    {
        var user = await users.GetByIdAsync(userId, ct);
        return user is null || user.IsLocked ? NotFound : Result.Success(PublicUserDto.From(user));
    }

    public async Task<IReadOnlyList<PublicUserDto>> SearchAsync(string? keyword, int take, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(keyword) || keyword.Trim().Length < 2) return [];
        return (await users.SearchAsync(keyword.Trim(), Math.Clamp(take, 1, 50), ct)).Select(PublicUserDto.From).ToList();
    }

    public async Task<Result<UserDto>> UpdateAsync(Guid userId, UpdateProfileRequest req, CancellationToken ct)
    {
        var user = await users.GetByIdAsync(userId, ct);
        if (user is null) return NotFound;
        var r = user.UpdateProfile(req.DisplayName, req.AvatarUrl, req.CoverUrl, req.Bio, req.Phone);
        if (r.IsFailure) return r.Error;
        // Đổi sang một tên mà ID hiện tại đã có người cùng tên dùng → cấp ID mới (người dùng thấy ID mới ở Cài đặt).
        if (!user.HasUserCode || await users.TagTakenAsync(user.DisplayName, user.UserCode, user.Id, ct)) await tags.AssignAsync(user, ct);
        await uow.SaveChangesAsync(ct);
        cache.Remove($"user:{userId}");   // tên/ảnh mới có hiệu lực ngay (IdentityApi cache hồ sơ 15 giây)
        // Realtime: bạn bè, thành viên server, người đang chat 1-1... thấy tên + ảnh mới mà không cần tải lại trang.
        await bus.PublishAsync(new UserProfileChanged(user.Id, user.DisplayName, user.Username, user.AvatarUrl), ct);
        return Result.Success(UserDto.From(user));
    }

    /// <summary>Đổi mật khẩu (hoặc đặt mật khẩu lần đầu cho tài khoản Google). Phải nhập đúng mật khẩu hiện tại nếu đã có.</summary>
    public async Task<Result> ChangePasswordAsync(Guid userId, ChangePasswordRequest req, CancellationToken ct)
    {
        var user = await users.GetByIdAsync(userId, ct);
        if (user is null) return Result.Failure(NotFound);
        if ((req.NewPassword ?? "").Length is < 6 or > 100) return Result.Failure(new Error("Auth.WeakPassword", "Mật khẩu mới dài 6–100 ký tự."));
        if (user.PasswordHash is not null)
        {
            if (string.IsNullOrEmpty(req.CurrentPassword) || !hasher.Verify(req.CurrentPassword, user.PasswordHash))
                return Result.Failure(Error.Forbidden("Auth.WrongPassword", "Mật khẩu hiện tại không đúng."));
            if (hasher.Verify(req.NewPassword!, user.PasswordHash))
                return Result.Failure(new Error("Auth.SamePassword", "Mật khẩu mới phải khác mật khẩu hiện tại."));
        }
        user.SetPasswordHash(hasher.Hash(req.NewPassword!));
        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result<UserDto>> UpdateSettingsAsync(Guid userId, UserSettingsRequest req, CancellationToken ct)
    {
        var user = await users.GetByIdAsync(userId, ct);
        if (user is null) return NotFound;
        user.Settings.SetTypingIndicator(req.TypingIndicatorEnabled);
        await uow.SaveChangesAsync(ct);
        return Result.Success(UserDto.From(user));
    }

    public async Task<Result> SetStatusAsync(Guid userId, UserStatus status, CancellationToken ct)
    {
        var user = await users.GetByIdAsync(userId, ct);
        if (user is null) return Result.Failure(NotFound);
        var r = user.SetStatus(status);
        if (r.IsFailure) return r;
        await uow.SaveChangesAsync(ct);
        // Ai quan tâm (Notifications, realtime) tự lắng nghe; Identity không cần biết họ là ai.
        await bus.PublishAsync(new UserStatusChanged(userId, status.ToString()), ct);
        return Result.Success();
    }
}
