namespace Nebula.Identity.Application;

// TODO: request gồm (string DisplayName, string? AvatarUrl, string? CoverUrl, string? Bio, string? Phone)
public sealed record UpdateProfileRequest
{
}

// TODO: request gồm (bool TypingIndicatorEnabled)
public sealed record UserSettingsRequest
{
}

// TODO: request gồm (string? CurrentPassword, string NewPassword)
public sealed record ChangePasswordRequest
{
}

// TODO: GetAsync, GetPublicAsync, SearchAsync, UpdateAsync, ChangePasswordAsync
//       UpdateSettingsAsync, SetStatusAsync
public sealed class ProfileService
{
}
