namespace Nebula.Shared.Contracts;

public sealed record UserSummary(Guid Id, string DisplayName, string? AvatarUrl, bool IsLocked, bool IsAdmin, bool TypingIndicatorEnabled, string Username = "", string Status = "Offline", string UserCode = "");

public interface IIdentityApi
{
    Task<UserSummary?> GetUserAsync(Guid userId, CancellationToken ct = default);
    Task<UserSummary?> FindByTagAsync(string displayName, string userCode, CancellationToken ct = default);
    Task<IReadOnlyDictionary<Guid, UserSummary>> GetUsersAsync(IReadOnlyCollection<Guid> userIds, CancellationToken ct = default);
    Task<bool> IsActiveAsync(Guid userId, CancellationToken ct = default);
}
