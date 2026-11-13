using Nebula.Friends.Domain;
using Nebula.Shared.Kernel;

namespace Nebula.Friends.Application;

public interface IFriendsUnitOfWork : IUnitOfWork { }

public interface IFriendshipRepository
{
    Task<Friendship?> GetAsync(Guid id, CancellationToken ct);
    /// <summary>Quan hệ giữa hai người (bất kể ai gửi trước), null nếu chưa có.</summary>
    Task<Friendship?> GetByPairAsync(Guid a, Guid b, CancellationToken ct);
    Task<IReadOnlyList<Friendship>> ListForUserAsync(Guid userId, CancellationToken ct);
    Task AddAsync(Friendship f, CancellationToken ct);
    void Remove(Friendship f);
}
