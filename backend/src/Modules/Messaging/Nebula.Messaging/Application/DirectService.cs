using Nebula.Messaging.Domain;
using Nebula.Shared.Contracts;
using Nebula.Shared.Kernel;

namespace Nebula.Messaging.Application;

public sealed class DirectService(IConversationRepository conversations, IIdentityApi identity, IFriendsApi friends, IMessagingUnitOfWork uow)
{
    private async Task<AuthorDto> OtherAsync(Guid otherId, CancellationToken ct)
        => MessageDtoFactory.AuthorOf(await identity.GetUsersAsync([otherId], ct), otherId);

    /// <summary>Mở (hoặc tạo nếu chưa có) chat 1-1. Gọi nhiều lần vẫn ra cùng một hội thoại.</summary>
    public async Task<Result<DirectDto>> OpenAsync(Guid userId, Guid otherUserId, CancellationToken ct)
    {
        if (userId == otherUserId) return new Error("Direct.Self", "Không thể nhắn tin cho chính mình.");
        if (!await identity.IsActiveAsync(otherUserId, ct)) return Error.NotFound("User.NotFound", "Người dùng không tồn tại hoặc đã bị khóa.");

        var conversation = await conversations.GetDirectAsync(Conversation.KeyFor(userId, otherUserId), ct);
        var isFriend = await friends.AreFriendsAsync(userId, otherUserId, ct);
        if (conversation is null)
        {
            // Chỉ bạn bè mới bắt đầu được cuộc trò chuyện 1-1 (chặn người lạ nhắn tin làm phiền).
            if (!isFriend) return Error.Forbidden("Direct.NotFriends", "Hai bạn cần là bạn bè mới nhắn tin riêng được.");
            conversation = Conversation.CreateDirect(userId, otherUserId);
            await conversations.AddAsync(conversation, ct);
            await conversations.AddMemberAsync(ConversationMember.Create(conversation.Id, userId), ct);
            await conversations.AddMemberAsync(ConversationMember.Create(conversation.Id, otherUserId), ct);
            await uow.SaveChangesAsync(ct);
        }
        return Result.Success(new DirectDto(conversation.Id, otherUserId, false, null, false, await OtherAsync(otherUserId, ct), isFriend));
    }

    /// <summary>Danh sách chat 1-1, mới nhất trước. Cuộc đã "xóa phía mình" chỉ hiện lại khi có tin mới.</summary>
    public async Task<IReadOnlyList<DirectDto>> ListAsync(Guid userId, bool archived, CancellationToken ct)
    {
        var rows = (await conversations.ListDirectForUserAsync(userId, ct))
            .Where(r => (r.State?.IsArchived ?? false) == archived)
            .Where(r => r.State?.ClearedAt == null || r.LastMessageAt > r.State.ClearedAt)
            .OrderByDescending(r => r.LastMessageAt ?? r.Conversation.CreatedAt)
            .ToList();
        var users = await identity.GetUsersAsync(rows.Select(r => r.Conversation.OtherParticipant(userId)).ToList(), ct);
        var result = new List<DirectDto>();
        foreach (var r in rows)
        {
            var otherId = r.Conversation.OtherParticipant(userId);
            result.Add(new DirectDto(r.Conversation.Id, otherId, r.State?.IsArchived ?? false, r.LastMessageAt,
                HasUnread: r.LastMessageAt is DateTime last && (r.State?.LastReadAt is not DateTime read || last > read),
                Other: MessageDtoFactory.AuthorOf(users, otherId), IsFriend: await friends.AreFriendsAsync(userId, otherId, ct)));
        }
        return result;
    }

    /// <summary>Ẩn/hiện cuộc trò chuyện chỉ với riêng người gọi; người kia vẫn thấy bình thường.</summary>
    public Task<Result> SetArchivedAsync(Guid userId, Guid conversationId, bool archived, CancellationToken ct)
        => UpdateStateAsync(userId, conversationId, s => s.SetArchived(archived), ct);

    /// <summary>Xóa cuộc trò chuyện phía mình: lịch sử cũ biến mất với mình, người kia không bị ảnh hưởng.</summary>
    public Task<Result> ClearAsync(Guid userId, Guid conversationId, CancellationToken ct)
        => UpdateStateAsync(userId, conversationId, s => s.Clear(), ct);

    private async Task<Result> UpdateStateAsync(Guid userId, Guid conversationId, Action<ConversationMember> change, CancellationToken ct)
    {
        var conversation = await conversations.GetAsync(conversationId, ct);
        if (conversation is null || !conversation.IsDirect) return Result.Failure(Error.NotFound("Direct.NotFound", "Không tìm thấy cuộc trò chuyện 1-1."));
        var state = await conversations.GetMemberAsync(conversationId, userId, ct);
        if (state is null) return Result.Failure(Error.Forbidden("Direct.NoAccess", "Bạn không ở trong cuộc trò chuyện này."));
        change(state);
        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}
