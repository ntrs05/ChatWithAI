using Microsoft.EntityFrameworkCore;
using Nebula.Organization.Application;
using Nebula.Organization.Domain;

namespace Nebula.Organization.Infrastructure;

internal sealed class EfServerRepository(OrganizationDbContext db) : IServerRepository
{
    private IQueryable<Server> Full => db.Servers.Include(g => g.Members).Include(g => g.Bans).AsSplitQuery();

    public Task<Server?> GetAsync(Guid serverId, CancellationToken ct) => Full.FirstOrDefaultAsync(g => g.Id == serverId, ct);

    public async Task<IReadOnlyList<Server>> ListForUserAsync(Guid userId, CancellationToken ct)
        => await Full.Where(g => g.Members.Any(m => m.UserId == userId)).OrderBy(g => g.Name).ToListAsync(ct);

    public async Task<IReadOnlyList<Server>> ListAllAsync(string? keyword, CancellationToken ct)
    {
        var query = Full.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(keyword)) query = query.Where(g => g.Name.Contains(keyword));
        return await query.OrderBy(g => g.Name).ToListAsync(ct);
    }

    public Task<Server?> GetByInviteCodeAsync(string code, CancellationToken ct)
        => Full.FirstOrDefaultAsync(g => g.InviteCode == code.ToUpper(), ct);

    public async Task<IReadOnlyList<Server>> ListJoinableAsync(string? keyword, CancellationToken ct)
    {
        var query = Full.AsNoTracking().Where(g => g.JoinPolicy != JoinPolicy.InviteOnly);
        if (!string.IsNullOrWhiteSpace(keyword)) query = query.Where(g => g.Name.Contains(keyword));
        return await query.OrderBy(g => g.Name).Take(50).ToListAsync(ct);
    }

    public async Task AddAsync(Server server, CancellationToken ct) => await db.Servers.AddAsync(server, ct);
    public void Remove(Server server) => db.Servers.Remove(server);
}

internal sealed class EfJoinRequestRepository(OrganizationDbContext db) : IJoinRequestRepository
{
    public Task<JoinRequest?> GetAsync(Guid id, CancellationToken ct) => db.JoinRequests.FirstOrDefaultAsync(r => r.Id == id, ct);

    public Task<JoinRequest?> FindPendingAsync(Guid serverId, Guid userId, CancellationToken ct)
        => db.JoinRequests.FirstOrDefaultAsync(r => r.ServerId == serverId && r.UserId == userId && r.Status == JoinRequestStatus.Pending, ct);

    public async Task<IReadOnlyList<JoinRequest>> ListPendingForServerAsync(Guid serverId, CancellationToken ct)
        => await db.JoinRequests.AsNoTracking().Where(r => r.ServerId == serverId && r.Status == JoinRequestStatus.Pending)
            .OrderBy(r => r.CreatedAt).ToListAsync(ct);

    public async Task<IReadOnlyList<JoinRequest>> ListPendingForUserAsync(Guid userId, CancellationToken ct)
        => await db.JoinRequests.AsNoTracking().Where(r => r.UserId == userId && r.Status == JoinRequestStatus.Pending)
            .OrderByDescending(r => r.CreatedAt).ToListAsync(ct);

    public async Task AddAsync(JoinRequest request, CancellationToken ct) => await db.JoinRequests.AddAsync(request, ct);
}

internal sealed class EfSettingRepository(OrganizationDbContext db) : ISettingRepository
{
    public async Task<IReadOnlyList<SystemSetting>> ListAsync(CancellationToken ct) => await db.Settings.AsNoTracking().ToListAsync(ct);
    public Task<SystemSetting?> GetAsync(string key, CancellationToken ct) => db.Settings.FirstOrDefaultAsync(s => s.Key == key, ct);
    public async Task AddAsync(SystemSetting setting, CancellationToken ct) => await db.Settings.AddAsync(setting, ct);
}
