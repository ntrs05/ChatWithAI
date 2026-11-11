using Microsoft.EntityFrameworkCore;
using Nebula.Identity.Application;
using Nebula.Identity.Domain;

namespace Nebula.Identity.Infrastructure;

internal sealed class EfUserRepository(IdentityDbContext db) : IUserRepository
{
    private IQueryable<User> Users => db.Users.Include(u => u.Settings);

    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct) => Users.FirstOrDefaultAsync(u => u.Id == id, ct);

    public async Task<IReadOnlyList<User>> GetByIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct)
        => await Users.AsNoTracking().Where(u => ids.Contains(u.Id)).ToListAsync(ct);

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct)
        => Users.FirstOrDefaultAsync(u => u.Email == email.ToLower(), ct);

    public Task<User?> FindByTagAsync(string displayName, string userCode, CancellationToken ct)
        => Users.FirstOrDefaultAsync(u => u.DisplayName == displayName && u.UserCode == userCode, ct);

    public Task<bool> TagTakenAsync(string displayName, string userCode, Guid? exceptUserId, CancellationToken ct)
        => db.Users.AnyAsync(u => u.DisplayName == displayName && u.UserCode == userCode && (exceptUserId == null || u.Id != exceptUserId), ct);

    public async Task<IReadOnlyList<User>> ListAsync(string? keyword, bool? locked, CancellationToken ct)
    {
        var query = Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(keyword)) query = query.Where(u => u.DisplayName.Contains(keyword) || u.Email.Contains(keyword));
        if (locked is bool l) query = query.Where(u => u.IsLocked == l);
        return await query.OrderBy(u => u.DisplayName).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<User>> SearchAsync(string keyword, int take, CancellationToken ct)
        => await Users.AsNoTracking()
            .Where(u => !u.IsLocked && (u.DisplayName.Contains(keyword) || u.Email.StartsWith(keyword)))
            .OrderBy(u => u.DisplayName).Take(take).ToListAsync(ct);

    public async Task AddAsync(User user, CancellationToken ct) => await db.Users.AddAsync(user, ct);
}
