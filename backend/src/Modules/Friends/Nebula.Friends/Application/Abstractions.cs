using Nebula.Friends.Domain;
using Nebula.Shared.Kernel;

namespace Nebula.Friends.Application;

public interface IFriendsUnitOfWork : IUnitOfWork { }

public interface IFriendshipRepository
{
    Task<Friendship?> GetAsync(Guid id, CancellationToken ct);
    Task<Friendship?> GetByPairAsync(Guid a, Guid b, CancellationToken ct);
    Task<IReadOnlyList<Friendship>> ListForUserAsync(Guid userId, CancellationToken ct);
    Task AddAsync(Friendship f, CancellationToken ct);
    void Remove(Friendship f);
}
