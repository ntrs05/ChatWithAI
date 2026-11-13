using Nebula.Organization.Domain;
using Nebula.Shared.Contracts;

namespace Nebula.Organization.Application;

public sealed class OrganizationQueries(IServerRepository servers, IIdentityApi identity) : IOrganizationApi
{
    public async Task<ServerAccess> GetAccessAsync(Guid serverId, Guid userId, CancellationToken ct = default)
    {
        var server = await servers.GetAsync(serverId, ct);
        if (server is null) return ServerAccess.None;
        var actor = new Actor(userId, (await identity.GetUserAsync(userId, ct))?.IsAdmin ?? false);
        return new ServerAccess(true, server.RoleOf(userId)?.ToString(), server.CanRead(actor), server.CanModerate(actor), server.CanManage(actor));
    }

    public async Task<IReadOnlyList<Guid>> GetMemberIdsAsync(Guid serverId, CancellationToken ct = default)
        => (await servers.GetAsync(serverId, ct))?.Members.Select(m => m.UserId).ToList() ?? [];

    public async Task<IReadOnlyList<Guid>> GetReadableServerIdsAsync(Guid userId, CancellationToken ct = default)
    {
        return (await servers.ListForUserAsync(userId, ct)).Select(g => g.Id).ToList();
    }
}
