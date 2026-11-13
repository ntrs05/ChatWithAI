namespace Nebula.Shared.Contracts;

public sealed record ServerAccess(bool Exists, string? Role, bool CanRead, bool CanModerate, bool CanManage)
{
    public static readonly ServerAccess None = new(false, null, false, false, false);
}

public interface IOrganizationApi
{
    Task<ServerAccess> GetAccessAsync(Guid serverId, Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<Guid>> GetMemberIdsAsync(Guid serverId, CancellationToken ct = default);
    Task<IReadOnlyList<Guid>> GetReadableServerIdsAsync(Guid userId, CancellationToken ct = default);
}
