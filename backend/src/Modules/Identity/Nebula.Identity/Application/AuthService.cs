namespace Nebula.Identity.Application;

// TODO: các trường (string AccessToken, UserDto User)
public sealed record LoginResponse
{
}

// TODO: các trường (Guid Id, string Email, string DisplayName, string? AvatarUrl, string? CoverUrl, string? Bio, string? Phone, string SystemRole, string Status, DateTime? LastSeenAt, bool IsLocked, string? LockedReason, bool TypingIndicatorEnabled, DateTime CreatedAt, string Username = "", bool HasPassword = false, string UserCode = "")
//       From
public sealed record UserDto
{
}

// TODO: request gồm (string Email, string DisplayName, string Password, string? AvatarUrl)
public sealed record RegisterRequest
{
}

// TODO: request gồm (string Email, string Password)
public sealed record LoginRequest
{
}

// TODO: các trường (Guid Id, string DisplayName, string? AvatarUrl, string? CoverUrl, string? Bio, string Status, DateTime? LastSeenAt, string Username = "")
//       From
public sealed record PublicUserDto
{
}

// TODO: RegisterAsync, LoginAsync, LoginWithGoogleAsync
public sealed class AuthService
{
}
