using Nebula.Shared.Kernel;

namespace Nebula.Friends.Domain;

public enum FriendshipStatus { Pending, Accepted }

/// <summary>
/// Quan hệ bạn bè giữa hai người. Một dòng cho MỖI CẶP (khóa "idNhỏ:idLớn" có chỉ mục UNIQUE nên không bao giờ trùng,
/// dù ai gửi trước). Luật nghiệp vụ nằm hết trong class này.
/// </summary>
public sealed class Friendship : Entity
{
    private Friendship() { }

    public string PairKey { get; private set; } = "";
    /// <summary>Người gửi lời mời.</summary>
    public Guid RequesterId { get; private set; }
    /// <summary>Người nhận lời mời.</summary>
    public Guid AddresseeId { get; private set; }
    public FriendshipStatus Status { get; private set; }
    public DateTime? AcceptedAt { get; private set; }

    public bool IsAccepted => Status == FriendshipStatus.Accepted;
    public bool Involves(Guid userId) => RequesterId == userId || AddresseeId == userId;
    public Guid OtherThan(Guid userId) => RequesterId == userId ? AddresseeId : RequesterId;

    public static string KeyFor(Guid a, Guid b)
        => string.CompareOrdinal(a.ToString(), b.ToString()) < 0 ? $"{a}:{b}" : $"{b}:{a}";

    public static Result<Friendship> Create(Guid requesterId, Guid addresseeId)
    {
        if (requesterId == addresseeId) return new Error("Friend.Self", "Không thể kết bạn với chính mình.");
        return Result.Success(new Friendship
        {
            PairKey = KeyFor(requesterId, addresseeId), RequesterId = requesterId, AddresseeId = addresseeId, Status = FriendshipStatus.Pending
        });
    }

    /// <summary>Chỉ NGƯỜI NHẬN mới chấp nhận được lời mời đang chờ.</summary>
    public Result Accept(Guid userId)
    {
        if (IsAccepted) return Result.Failure(Error.Conflict("Friend.AlreadyFriends", "Hai bạn đã là bạn bè."));
        if (userId != AddresseeId) return Result.Failure(Error.Forbidden("Friend.NotAddressee", "Chỉ người nhận lời mời mới chấp nhận được."));
        Status = FriendshipStatus.Accepted;
        AcceptedAt = DateTime.UtcNow;
        return Result.Success();
    }

    /// <summary>Ai được xóa dòng này: lời mời đang chờ thì cả hai bên (người nhận từ chối, người gửi hủy); đã là bạn thì cả hai (hủy kết bạn).</summary>
    public Result EnsureCanEnd(Guid userId)
        => Involves(userId) ? Result.Success() : Result.Failure(Error.Forbidden("Friend.NotInvolved", "Bạn không thuộc quan hệ này."));
}
