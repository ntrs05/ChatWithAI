namespace Nebula.Shared.Contracts;

/// <summary>Cổng để module khác HỎI Friends. Messaging dùng để chỉ cho bạn bè nhắn tin 1-1 với nhau.</summary>
public interface IFriendsApi
{
    Task<bool> AreFriendsAsync(Guid userA, Guid userB, CancellationToken ct = default);
}
