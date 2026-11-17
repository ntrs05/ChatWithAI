using Nebula.Organization.Domain;

namespace Nebula.Organization.Application;

public interface IOrganizationUnitOfWork : Nebula.Shared.Kernel.IUnitOfWork { }

public interface IServerRepository
{
    Task<Server?> GetAsync(Guid serverId, CancellationToken ct);
    Task<Server?> GetByInviteCodeAsync(string code, CancellationToken ct);
    Task<IReadOnlyList<Server>> ListForUserAsync(Guid userId, CancellationToken ct);
    Task<IReadOnlyList<Server>> ListAllAsync(string? keyword, CancellationToken ct);
    Task<IReadOnlyList<Server>> ListJoinableAsync(string? keyword, CancellationToken ct);
    Task AddAsync(Server server, CancellationToken ct);
    void Remove(Server server);
}

public interface IJoinRequestRepository
{
    Task<JoinRequest?> GetAsync(Guid id, CancellationToken ct);
    Task<JoinRequest?> FindPendingAsync(Guid serverId, Guid userId, CancellationToken ct);
    Task<IReadOnlyList<JoinRequest>> ListPendingForServerAsync(Guid serverId, CancellationToken ct);
    Task<IReadOnlyList<JoinRequest>> ListPendingForUserAsync(Guid userId, CancellationToken ct);
    Task AddAsync(JoinRequest request, CancellationToken ct);
}

public interface ISettingRepository
{
    Task<IReadOnlyList<SystemSetting>> ListAsync(CancellationToken ct);
    Task<SystemSetting?> GetAsync(string key, CancellationToken ct);
    Task AddAsync(SystemSetting setting, CancellationToken ct);
}
