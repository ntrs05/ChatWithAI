namespace Nebula.Shared.Contracts;

public interface IFriendsApi
{
    Task<bool> AreFriendsAsync(Guid userA, Guid userB, CancellationToken ct = default);
}
