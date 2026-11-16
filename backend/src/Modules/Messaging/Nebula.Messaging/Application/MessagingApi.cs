using Nebula.Messaging.Domain;
using Nebula.Shared.Contracts;

namespace Nebula.Messaging.Application;

/// <summary>Hiện thực IMessagingApi: dùng lại ConversationAccess để kiểm tra quyền đọc, nên module Ai không cần biết luật phân quyền.</summary>
public sealed class MessagingApi(ConversationAccess access, IMessageRepository messages, IIdentityApi identity, IMessagingUnitOfWork uow, IEventBus bus) : IMessagingApi
{
    public async Task<RecentChat> GetRecentChatAsync(Guid userId, Guid conversationId, int limit, DateTime? since = null, CancellationToken ct = default)
    {
        var a = await access.CheckAsync(conversationId, userId, ct);
        if (a is null) return RecentChat.Missing;
        var isText = a.Conversation.IsDirect || a.Conversation.Kind == ChannelKind.Text;
        if (!a.CanRead || !isText) return new RecentChat(true, a.CanRead, isText, []);

        var newestFirst = await messages.ListAsync(conversationId, null, since, Math.Clamp(limit, 1, 300), ct);
        var users = await identity.GetUsersAsync(newestFirst.Select(m => m.SenderId).Where(id => id != BotIdentity.Id).ToList(), ct);
        // Bỏ tin của bot và các câu gọi bot ("@nebula ...") khỏi nội dung cần tóm tắt.
        var lines = newestFirst.Where(m => !m.IsDeleted && m.SenderId != BotIdentity.Id && !IsBotCommand(m.Content)).Reverse()
            .Select(m => new ChatLine(users.TryGetValue(m.SenderId, out var u) ? u.DisplayName : "Ẩn danh", m.Content, m.CreatedAt, m.Attachments.Count))
            .ToList();
        return new RecentChat(true, true, true, lines);
    }

    public async Task<bool> PostAsBotAsync(Guid requesterId, Guid conversationId, string content, Guid? replyToId = null, CancellationToken ct = default)
    {
        var a = await access.CheckAsync(conversationId, requesterId, ct);
        if (a is null || !a.CanRead || a.Conversation.IsDirect || a.Conversation.Kind != ChannelKind.Text) return false;

        if (content.Length > Message.MaxLength) content = content[..(Message.MaxLength - 1)] + "…";
        var created = Message.Create(conversationId, BotIdentity.Id, content, [], null, replyToId);
        if (created.IsFailure) return false;
        await messages.AddAsync(created.Value, ct);
        await uow.SaveChangesAsync(ct);

        // Người nhận = mọi người đọc được kênh (kênh riêng tư thì chỉ những người trong danh sách).
        await bus.PublishAsync(new MessageSent(created.Value.Id, conversationId, a.Conversation.ServerId, BotIdentity.Id, created.Value.Content,
            created.Value.CreatedAt, false, a.ParticipantIds.ToList(), []), ct);
        return true;
    }

    private static bool IsBotCommand(string content)
        => content.AsSpan().TrimStart().StartsWith("@nebula", StringComparison.OrdinalIgnoreCase);
}
