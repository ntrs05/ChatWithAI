using Nebula.Identity.Domain;
using Nebula.Shared.Contracts;
using Nebula.Shared.Kernel;

namespace Nebula.Identity.Application;

public sealed record LoginResponse(string AccessToken, UserDto User);

/// <summary>Thông tin đầy đủ, chỉ trả cho chính chủ hoặc admin hệ thống.</summary>
public sealed record UserDto(
    Guid Id, string Email, string DisplayName, string? AvatarUrl, string? CoverUrl, string? Bio, string? Phone,
    string SystemRole, string Status, DateTime? LastSeenAt, bool IsLocked, string? LockedReason, bool TypingIndicatorEnabled, DateTime CreatedAt,
    string Username = "", bool HasPassword = false, string UserCode = "")
{
    public static UserDto From(User u) => new(u.Id, u.Email, u.DisplayName, u.AvatarUrl, u.CoverUrl, u.Bio, u.Phone,
        u.SystemRole.ToString(), u.Status.ToString(), u.LastSeenAt, u.IsLocked, u.LockedReason, u.Settings.TypingIndicatorEnabled, u.CreatedAt,
        u.Username, u.HasPassword, u.UserCode);
}

public sealed record RegisterRequest(string Email, string DisplayName, string Password, string? AvatarUrl);
public sealed record LoginRequest(string Email, string Password);

/// <summary>Thông tin công khai khi xem hồ sơ người khác: không có email, số điện thoại.</summary>
public sealed record PublicUserDto(Guid Id, string DisplayName, string? AvatarUrl, string? CoverUrl, string? Bio, string Status, DateTime? LastSeenAt, string Username = "")
{
    public static PublicUserDto From(User u) => new(u.Id, u.DisplayName, u.AvatarUrl, u.CoverUrl, u.Bio, u.Status.ToString(), u.LastSeenAt, u.Username);
}

public sealed class AuthService(
    IGoogleTokenValidator google, IAdminPolicy admins, IUserRepository users, ITokenService tokens, IPasswordHasher hasher,
    UserTagService tags, IIdentityUnitOfWork uow, IEventBus bus)
{
    private static readonly System.Text.RegularExpressions.Regex EmailRe = new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$");

    /// <summary>Đăng ký bằng email + mật khẩu.</summary>
    public async Task<Result<LoginResponse>> RegisterAsync(RegisterRequest req, CancellationToken ct)
    {
        var email = (req.Email ?? "").Trim().ToLowerInvariant();
        var name = (req.DisplayName ?? "").Trim();
        if (!EmailRe.IsMatch(email) || email.Length > 255) return new Error("Auth.InvalidEmail", "Email không hợp lệ.");
        if (name.Length is < 2 or > 50) return new Error("Auth.InvalidName", "Tên hiển thị dài 2–50 ký tự.");
        if ((req.Password ?? "").Length is < 6 or > 100) return new Error("Auth.WeakPassword", "Mật khẩu dài 6–100 ký tự.");
        if (await users.GetByEmailAsync(email, ct) is not null) return Error.Conflict("Auth.EmailTaken", "Email này đã được đăng ký.");

        var role = admins.IsAdminEmail(email) ? SystemRole.Admin : SystemRole.Member;
        var user = User.RegisterWithPassword(email, name, req.AvatarUrl, hasher.Hash(req.Password!), role);
        await tags.AssignAsync(user, ct);
        await users.AddAsync(user, ct);
        await uow.SaveChangesAsync(ct);
        await bus.PublishAsync(new UserRegistered(user.Id, user.Email, user.DisplayName), ct);
        return Result.Success(new LoginResponse(tokens.CreateAccessToken(user), UserDto.From(user)));
    }

    /// <summary>Đăng nhập bằng email + mật khẩu. Thông báo lỗi chung chung để không lộ email nào đã đăng ký.</summary>
    public async Task<Result<LoginResponse>> LoginAsync(LoginRequest req, CancellationToken ct)
    {
        var invalid = Error.Forbidden("Auth.InvalidCredentials", "Email hoặc mật khẩu không đúng.");
        var user = await users.GetByEmailAsync((req.Email ?? "").Trim().ToLowerInvariant(), ct);
        if (user?.PasswordHash is null || !hasher.Verify(req.Password ?? "", user.PasswordHash)) return invalid;
        if (user.IsLocked) return Error.Forbidden("Auth.Locked", $"Tài khoản đã bị khóa: {user.LockedReason}");

        if (await tags.EnsureAsync(user, ct)) await uow.SaveChangesAsync(ct);   // tài khoản cũ thiếu ID → cấp bù
        if (admins.IsAdminEmail(user.Email) && !user.IsAdmin)
        {
            user.PromoteToAdmin();
            await uow.SaveChangesAsync(ct);
        }
        return Result.Success(new LoginResponse(tokens.CreateAccessToken(user), UserDto.From(user)));
    }

    /// <summary>Đăng nhập bằng Google. Lần đầu đăng nhập thì tự tạo tài khoản (đăng ký).</summary>
    public async Task<Result<LoginResponse>> LoginWithGoogleAsync(string idToken, CancellationToken ct)
    {
        var identity = await google.ValidateAsync(idToken, ct);
        if (identity is null)
            return Error.Forbidden("Auth.InvalidToken", "Google token không hợp lệ.");

        var isAdmin = admins.IsAdminEmail(identity.Email);
        var user = await users.GetByEmailAsync(identity.Email, ct);
        if (user is null)
        {
            user = User.Register(identity.Email, identity.Subject, identity.Name, identity.Picture, isAdmin ? SystemRole.Admin : SystemRole.Member);
            await tags.AssignAsync(user, ct);
            await users.AddAsync(user, ct);
            await uow.SaveChangesAsync(ct);
            await bus.PublishAsync(new UserRegistered(user.Id, user.Email, user.DisplayName), ct);
        }
        else if (isAdmin && !user.IsAdmin)
        {
            // Thêm email vào ADMIN_EMAILS sau khi người đó đã đăng ký thì lần đăng nhập tới tự lên admin hệ thống.
            user.PromoteToAdmin();
            await uow.SaveChangesAsync(ct);
        }

        if (user.IsLocked)
            return Error.Forbidden("Auth.Locked", $"Tài khoản đã bị khóa: {user.LockedReason}");

        if (await tags.EnsureAsync(user, ct)) await uow.SaveChangesAsync(ct);   // tài khoản cũ thiếu ID → cấp bù
        return Result.Success(new LoginResponse(tokens.CreateAccessToken(user), UserDto.From(user)));
    }
}
