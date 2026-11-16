using Nebula.Messaging.Domain;
using Nebula.Shared.Contracts;

namespace Nebula.Messaging.Application;

/// <summary>Đổi Message (domain) thành MessageDto có đủ người gửi + server. Hỏi Identity MỘT lần cho cả danh sách,
/// nên tải 50 tin vẫn chỉ tốn một truy vấn người dùng.</summary>
public sealed class MessageDtoFactory(IIdentityApi identity, IConversationRepository conversations)
{
    public async Task<IReadOnlyList<MessageDto>> ToDtosAsync(IReadOnlyList<Message> messages, IReadOnlySet<Guid>? pinned, CancellationToken ct)
    {
        if (messages.Count == 0) return [];
        var users = await identity.GetUsersAsync(messages.Select(m => m.SenderId).Where(id => id != BotIdentity.Id).ToList(), ct);
        var serverOf = new Dictionary<Guid, Guid?>();
        foreach (var id in messages.Select(m => m.ConversationId).Distinct())
            serverOf[id] = (await conversations.GetAsync(id, ct))?.ServerId;

        return messages.Select(m => MessageDto.From(m, pinned?.Contains(m.Id) ?? false) with
        {
            ServerId = serverOf[m.ConversationId],
            Author = AuthorOf(users, m.SenderId)
        }).ToList();
    }

    public async Task<MessageDto> ToDtoAsync(Message message, bool isPinned, CancellationToken ct)
        => (await ToDtosAsync([message], isPinned ? new HashSet<Guid> { message.Id } : null, ct))[0];

    public static AuthorDto AuthorOf(IReadOnlyDictionary<Guid, UserSummary> users, Guid id)
        => id == BotIdentity.Id ? new AuthorDto(id, BotIdentity.DisplayName, BotIdentity.Username, null)
        : users.TryGetValue(id, out var u) ? new AuthorDto(u.Id, u.DisplayName, u.Username, u.AvatarUrl) : new AuthorDto(id, "Người dùng đã xóa", "", null);
}
