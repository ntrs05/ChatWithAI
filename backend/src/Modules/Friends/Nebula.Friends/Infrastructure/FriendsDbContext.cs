using Microsoft.EntityFrameworkCore;
using Nebula.Friends.Application;
using Nebula.Friends.Domain;

namespace Nebula.Friends.Infrastructure;

public sealed class FriendsDbContext(DbContextOptions<FriendsDbContext> options) : DbContext(options), IFriendsUnitOfWork
{
    public DbSet<Friendship> Friendships => Set<Friendship>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Friendship>(e =>
        {
            e.ToTable("friends_friendships");
            e.Property(x => x.Id).ValueGeneratedNever();                  // Id (Guid v7) do code tự sinh
            e.Property(x => x.PairKey).HasMaxLength(80).IsRequired();
            e.HasIndex(x => x.PairKey).IsUnique();                         // mỗi cặp đúng MỘT dòng, dù ai mời trước
            e.HasIndex(x => x.RequesterId);
            e.HasIndex(x => x.AddresseeId);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Ignore(x => x.IsAccepted);
        });
    }
}

internal sealed class EfFriendshipRepository(FriendsDbContext db) : IFriendshipRepository
{
    public Task<Friendship?> GetAsync(Guid id, CancellationToken ct) => db.Friendships.FirstOrDefaultAsync(f => f.Id == id, ct);

    public Task<Friendship?> GetByPairAsync(Guid a, Guid b, CancellationToken ct)
    {
        var key = Friendship.KeyFor(a, b);
        return db.Friendships.FirstOrDefaultAsync(f => f.PairKey == key, ct);
    }

    public async Task<IReadOnlyList<Friendship>> ListForUserAsync(Guid userId, CancellationToken ct)
        => await db.Friendships.AsNoTracking().Where(f => f.RequesterId == userId || f.AddresseeId == userId).ToListAsync(ct);

    public async Task AddAsync(Friendship f, CancellationToken ct) => await db.Friendships.AddAsync(f, ct);
    public void Remove(Friendship f) => db.Friendships.Remove(f);
}
