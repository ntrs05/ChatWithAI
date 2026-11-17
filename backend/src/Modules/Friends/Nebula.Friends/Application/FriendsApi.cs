using Nebula.Shared.Contracts;

namespace Nebula.Friends.Application;

public sealed class FriendsApi(IFriendshipRepository friendships) : IFriendsApi
{
    public async Task<bool> AreFriendsAsync(Guid userA, Guid userB, CancellationToken ct = default)
        => userA != userB && (await friendships.GetByPairAsync(userA, userB, ct))?.IsAccepted == true;
}
