using Nebula.Friends.Domain;
using Nebula.Shared.Contracts;
using Nebula.Shared.Kernel;

namespace Nebula.Friends.Application;

public sealed record SendFriendRequest(Guid UserId);
/// <summary>Kết bạn theo "tên + ID": phải biết CẢ tên hiển thị lẫn ID 4 chữ số (0000–9999) của người kia.</summary>
public sealed record SendFriendByTagRequest(string DisplayName, string UserCode);

/// <summary>Hồ sơ rút gọn của người kia.</summary>
public sealed record FriendUserDto(Guid Id, string DisplayName, string Username, string? AvatarUrl, string Status);

/// <param name="Id">Id quan hệ (dùng để chấp nhận / từ chối / hủy lời mời).</param>
public sealed record FriendDto(Guid Id, FriendUserDto User, DateTime Since);
public sealed record FriendRequestDto(Guid Id, FriendUserDto User, DateTime CreatedAt);
public sealed record FriendRequestsDto(IReadOnlyList<FriendRequestDto> Incoming, IReadOnlyList<FriendRequestDto> Outgoing);

/// <summary>Kết quả gửi lời mời: nếu người kia đã gửi cho mình từ trước thì hai bên tự thành bạn (AutoAccepted = true).</summary>
public sealed record SendResultDto(Guid Id, bool AutoAccepted);

public sealed class FriendService(IFriendshipRepository friendships, IIdentityApi identity, IFriendsUnitOfWork uow, IEventBus bus)
{
    private static readonly Error NotFound = Error.NotFound("Friend.NotFound", "Không tìm thấy lời mời / quan hệ bạn bè.");

    // ===== Gửi / chấp nhận / từ chối =====

    /// <summary>Gửi lời mời theo tên + ID. Sai một trong hai đều trả cùng một lỗi, để không ai dò ra "ID này tồn tại, tên là gì".</summary>
    public async Task<Result<SendResultDto>> SendRequestByTagAsync(Guid userId, string? displayName, string? userCode, CancellationToken ct)
    {
        var notFound = Error.NotFound("Friend.TagNotFound", "Không tìm thấy ai khớp cả tên và ID. Hãy kiểm tra lại với người bạn muốn kết bạn.");
        var name = (displayName ?? "").Trim();
        var digits = new string((userCode ?? "").Where(char.IsAsciiDigit).ToArray());   // cho phép gõ "#0042", "42", "0042"
        if (name.Length == 0 || digits.Length is < 1 or > 4) return notFound;
        var code = digits.PadLeft(4, '0');                                               // ID 0–9999 luôn đủ 4 chữ số

        var target = await identity.FindByTagAsync(name, code, ct);
        // Kiểm tra lại chặt: so tên theo đúng từng ký tự (không phân biệt hoa/thường), không lệch dấu tiếng Việt.
        if (target is null || !string.Equals(target.DisplayName.Trim(), name, StringComparison.OrdinalIgnoreCase)) return notFound;
        return await SendRequestAsync(userId, target.Id, ct);
    }

    public async Task<Result<SendResultDto>> SendRequestAsync(Guid userId, Guid targetId, CancellationToken ct)
    {
        if (userId == targetId) return new Error("Friend.Self", "Không thể kết bạn với chính mình.");
        if (!await identity.IsActiveAsync(targetId, ct)) return Error.NotFound("User.NotFound", "Người dùng không tồn tại hoặc đã bị khóa.");

        var existing = await friendships.GetByPairAsync(userId, targetId, ct);
        if (existing is not null)
        {
            if (existing.IsAccepted) return Error.Conflict("Friend.AlreadyFriends", "Hai bạn đã là bạn bè.");
            if (existing.RequesterId == userId) return Error.Conflict("Friend.AlreadySent", "Bạn đã gửi lời mời cho người này rồi.");
            // Người kia đã mời mình trước → mình mời lại tức là đồng ý.
            var accepted = existing.Accept(userId);
            if (accepted.IsFailure) return accepted.Error;
            await uow.SaveChangesAsync(ct);
            await bus.PublishAsync(new FriendRequestAccepted(existing.Id, existing.RequesterId, existing.AddresseeId), ct);
            return Result.Success(new SendResultDto(existing.Id, true));
        }

        var created = Friendship.Create(userId, targetId);
        if (created.IsFailure) return created.Error;
        await friendships.AddAsync(created.Value, ct);
        await uow.SaveChangesAsync(ct);
        await bus.PublishAsync(new FriendRequestSent(created.Value.Id, userId, targetId), ct);
        return Result.Success(new SendResultDto(created.Value.Id, false));
    }

    public async Task<Result> AcceptAsync(Guid userId, Guid friendshipId, CancellationToken ct)
    {
        var f = await friendships.GetAsync(friendshipId, ct);
        if (f is null || !f.Involves(userId)) return Result.Failure(NotFound);
        var r = f.Accept(userId);
        if (r.IsFailure) return r;
        await uow.SaveChangesAsync(ct);
        await bus.PublishAsync(new FriendRequestAccepted(f.Id, f.RequesterId, f.AddresseeId), ct);
        return Result.Success();
    }

    /// <summary>Từ chối (người nhận) hoặc hủy (người gửi) một lời mời đang chờ.</summary>
    public async Task<Result> DeclineOrCancelAsync(Guid userId, Guid friendshipId, CancellationToken ct)
    {
        var f = await friendships.GetAsync(friendshipId, ct);
        if (f is null || !f.Involves(userId) || f.IsAccepted) return Result.Failure(NotFound);
        friendships.Remove(f);
        await uow.SaveChangesAsync(ct);
        await bus.PublishAsync(new FriendshipEnded(userId, f.OtherThan(userId), f.RequesterId == userId ? "Cancelled" : "Declined"), ct);
        return Result.Success();
    }

    /// <summary>Hủy kết bạn.</summary>
    public async Task<Result> RemoveFriendAsync(Guid userId, Guid otherUserId, CancellationToken ct)
    {
        var f = await friendships.GetByPairAsync(userId, otherUserId, ct);
        if (f is null || !f.IsAccepted) return Result.Failure(Error.NotFound("Friend.NotFriends", "Hai bạn chưa là bạn bè."));
        friendships.Remove(f);
        await uow.SaveChangesAsync(ct);
        await bus.PublishAsync(new FriendshipEnded(userId, otherUserId, "Removed"), ct);
        return Result.Success();
    }

    // ===== Danh sách =====

    public async Task<IReadOnlyList<FriendDto>> ListFriendsAsync(Guid userId, CancellationToken ct)
    {
        var all = (await friendships.ListForUserAsync(userId, ct)).Where(f => f.IsAccepted).ToList();
        var users = await identity.GetUsersAsync(all.Select(f => f.OtherThan(userId)).ToList(), ct);
        return all.Where(f => users.ContainsKey(f.OtherThan(userId)))
            .Select(f => new FriendDto(f.Id, ToDto(users[f.OtherThan(userId)]), f.AcceptedAt ?? f.CreatedAt))
            .OrderBy(f => f.User.DisplayName).ToList();
    }

    public async Task<FriendRequestsDto> ListRequestsAsync(Guid userId, CancellationToken ct)
    {
        var pending = (await friendships.ListForUserAsync(userId, ct)).Where(f => !f.IsAccepted).ToList();
        var users = await identity.GetUsersAsync(pending.Select(f => f.OtherThan(userId)).ToList(), ct);
        List<FriendRequestDto> Map(IEnumerable<Friendship> list) => list.Where(f => users.ContainsKey(f.OtherThan(userId)))
            .OrderByDescending(f => f.CreatedAt).Select(f => new FriendRequestDto(f.Id, ToDto(users[f.OtherThan(userId)]), f.CreatedAt)).ToList();
        return new FriendRequestsDto(Map(pending.Where(f => f.AddresseeId == userId)), Map(pending.Where(f => f.RequesterId == userId)));
    }

    public static FriendUserDto ToDto(UserSummary u) => new(u.Id, u.DisplayName, u.Username, u.AvatarUrl, u.Status);
}
