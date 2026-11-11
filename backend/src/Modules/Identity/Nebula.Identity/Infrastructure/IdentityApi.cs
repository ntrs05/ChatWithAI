using Microsoft.Extensions.Caching.Memory;
using Nebula.Identity.Application;
using Nebula.Shared.Contracts;

namespace Nebula.Identity.Infrastructure;

/// <summary>Cổng công khai để module khác hỏi Identity. Cache 15 giây vì được gọi ở MỌI request (kiểm tra tài khoản bị khóa chưa).</summary>
internal sealed class IdentityApi(IUserRepository users, IMemoryCache cache) : IIdentityApi
{
    public Task<UserSummary?> GetUserAsync(Guid userId, CancellationToken ct = default)
        => cache.GetOrCreateAsync($"user:{userId}", async e =>
        {
            e.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(15);
            var u = await users.GetByIdAsync(userId, ct);
            return u is null ? null : ToSummary(u);
        });

    public async Task<UserSummary?> FindByTagAsync(string displayName, string userCode, CancellationToken ct = default)
    {
        var u = await users.FindByTagAsync(displayName.Trim(), userCode.Trim(), ct);
        return u is null || u.IsLocked ? null : ToSummary(u);
    }

    public async Task<IReadOnlyDictionary<Guid, UserSummary>> GetUsersAsync(IReadOnlyCollection<Guid> userIds, CancellationToken ct = default)
    {
        var result = new Dictionary<Guid, UserSummary>();
        var missing = new List<Guid>();
        foreach (var id in userIds.Distinct())
        {
            if (cache.TryGetValue($"user:{id}", out UserSummary? cached) && cached is not null) result[id] = cached;
            else missing.Add(id);
        }
        if (missing.Count == 0) return result;
        foreach (var u in await users.GetByIdsAsync(missing, ct))
        {
            var summary = ToSummary(u);
            result[u.Id] = summary;
            cache.Set($"user:{u.Id}", summary, TimeSpan.FromSeconds(15));
        }
        return result;
    }

    private static UserSummary ToSummary(Domain.User u)
        => new(u.Id, u.DisplayName, u.AvatarUrl, u.IsLocked, u.IsAdmin, u.Settings.TypingIndicatorEnabled, u.Username, u.Status.ToString(), u.UserCode);

    public async Task<bool> IsActiveAsync(Guid userId, CancellationToken ct = default)
        => await GetUserAsync(userId, ct) is { IsLocked: false };
}
