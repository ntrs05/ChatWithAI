using Nebula.Shared.Kernel;

namespace Nebula.Identity.Domain;

public enum UserStatus { Offline, Online, Idle, DoNotDisturb }

public enum SystemRole { Member, Admin }

public sealed class User : Entity
{
    private User() { } // EF Core

    public string Email { get; private set; } = "";
    public string GoogleSubject { get; private set; } = "";
    public string UserCode { get; private set; } = "";
    public string? PasswordHash { get; private set; }
    public string DisplayName { get; private set; } = "";
    public string? AvatarUrl { get; private set; }
    public string? CoverUrl { get; private set; }
    public string? Bio { get; private set; }
    public string? Phone { get; private set; }
    public SystemRole SystemRole { get; private set; } = SystemRole.Member;
    public UserStatus Status { get; private set; } = UserStatus.Offline;
    public DateTime? LastSeenAt { get; private set; }

    public bool IsLocked { get; private set; }
    public string? LockedReason { get; private set; }
    public Guid? LockedBy { get; private set; }
    public DateTime? LockedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    public UserSettings Settings { get; private set; } = null!;

    public bool IsAdmin => SystemRole == SystemRole.Admin;
    public bool HasPassword => PasswordHash is not null;

    public const int UserCodeLength = 4;
    public bool HasUserCode => UserCode.Length == UserCodeLength && UserCode.All(char.IsAsciiDigit);

    public static string NewUserCode()
        => System.Security.Cryptography.RandomNumberGenerator.GetInt32(0, 10_000).ToString("D4");

    public void AssignUserCode(string code)
    {
        if (code.Length != UserCodeLength || !code.All(char.IsAsciiDigit)) throw new ArgumentException("ID phải gồm 4 chữ số (0000–9999).", nameof(code));
        UserCode = code;
    }
    public string Username => Email.Split('@')[0];

    public static User RegisterWithPassword(string email, string displayName, string? avatarUrl, string passwordHash, SystemRole role)
    {
        var user = Register(email, "", displayName, avatarUrl, role);
        user.GoogleSubject = $"local:{user.Id}";
        user.PasswordHash = passwordHash;
        return user;
    }

    public void SetPasswordHash(string passwordHash)
    {
        PasswordHash = passwordHash;
        UpdatedAt = DateTime.UtcNow;
    }

    public static User Register(string email, string googleSubject, string displayName, string? avatarUrl, SystemRole role)
    {
        var user = new User
        {
            Email = email.Trim().ToLowerInvariant(),
            GoogleSubject = googleSubject,
            DisplayName = string.IsNullOrWhiteSpace(displayName) ? email.Split('@')[0] : displayName.Trim(),
            AvatarUrl = avatarUrl,
            SystemRole = role
        };
        user.Settings = UserSettings.CreateDefault(user.Id);
        return user;
    }

    public Result UpdateProfile(string displayName, string? avatarUrl, string? coverUrl, string? bio, string? phone)
    {
        if (string.IsNullOrWhiteSpace(displayName) || displayName.Length > 50)
            return Result.Failure(new Error("User.InvalidName", "Tên hiển thị phải từ 1 đến 50 ký tự."));
        if (bio?.Length > 300) return Result.Failure(new Error("User.InvalidBio", "Giới thiệu tối đa 300 ký tự."));
        if (phone?.Length > 20) return Result.Failure(new Error("User.InvalidPhone", "Số điện thoại không hợp lệ."));
        DisplayName = displayName.Trim();
        AvatarUrl = avatarUrl;
        CoverUrl = coverUrl;
        Bio = bio?.Trim();
        Phone = phone?.Trim();
        UpdatedAt = DateTime.UtcNow;
        return Result.Success();
    }

    public Result SetStatus(UserStatus status)
    {
        if (IsLocked) return Result.Failure(Error.Forbidden("User.Locked", "Tài khoản đã bị khóa."));
        Status = status;
        if (status == UserStatus.Offline) LastSeenAt = DateTime.UtcNow;
        return Result.Success();
    }

    public void PromoteToAdmin() => SystemRole = SystemRole.Admin;

    public Result Lock(Guid actorId, string reason)
    {
        if (IsAdmin) return Result.Failure(Error.Forbidden("User.CannotLockAdmin", "Không thể khóa tài khoản admin hệ thống."));
        if (string.IsNullOrWhiteSpace(reason)) return Result.Failure(new Error("User.ReasonRequired", "Cần ghi lý do khóa."));
        IsLocked = true;
        LockedReason = reason.Trim();
        LockedBy = actorId;
        LockedAt = DateTime.UtcNow;
        Status = UserStatus.Offline;
        return Result.Success();
    }

    public void Unlock()
    {
        IsLocked = false;
        LockedReason = null;
        LockedBy = null;
        LockedAt = null;
    }
}

public sealed class UserSettings
{
    private UserSettings() { }
    public Guid UserId { get; private set; }
    public bool TypingIndicatorEnabled { get; private set; } = true;

    public static UserSettings CreateDefault(Guid userId) => new() { UserId = userId };
    public void SetTypingIndicator(bool enabled) => TypingIndicatorEnabled = enabled;
}
