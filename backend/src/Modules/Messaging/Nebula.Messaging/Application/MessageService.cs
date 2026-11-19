using System.Text.RegularExpressions;
using Nebula.Messaging.Domain;
using Nebula.Shared.Contracts;
using Nebula.Shared.Kernel;

namespace Nebula.Messaging.Application;

public sealed record SendMessageRequest(string? Content, IReadOnlyList<Guid>? AttachmentIds = null, Guid? ReplyToId = null);

public sealed partial class MessageService(
    ConversationAccess access, IConversationRepository conversations, IMessageRepository messages,
    IOrganizationApi organization, IMediaApi media, IFriendsApi friends, MessageDtoFactory factory, IMessagingUnitOfWork uow, IEventBus bus)
{
    // tag người dùng dạng <@guid>
    [GeneratedRegex(@"<@([0-9a-fA-F\-]{36})>")]
    private static partial Regex MentionRegex();

    private static readonly Error NotFound = Error.NotFound("Conversation.NotFound", "Không tìm thấy hội thoại.");
    private static readonly Error NoAccess = Error.Forbidden("Conversation.NoAccess", "Bạn không có quyền trong hội thoại này.");
    private static readonly Error MessageNotFound = Error.NotFound("Message.NotFound", "Không tìm thấy tin nhắn.");

    public async Task<Result<MessageDto>> SendAsync(Guid senderId, Guid conversationId, SendMessageRequest req, CancellationToken ct)
    {
        var a = await access.CheckAsync(conversationId, senderId, ct);
        if (a is null) return NotFound;
        if (!a.CanRead) return NoAccess;
        if (a.Conversation.Kind == ChannelKind.Voice) return new Error("Channel.VoiceOnly", "Kênh voice không nhắn tin.");
        // hủy kết bạn thì không nhắn thêm được
        if (a.Conversation.IsDirect && !await friends.AreFriendsAsync(senderId, a.Conversation.OtherParticipant(senderId), ct))
            return Error.Forbidden("Direct.NotFriends", "Hai bạn không còn là bạn bè nên không thể nhắn tin riêng.");

        // chỉ tag người trong hội thoại
        var mentioned = MentionRegex().Matches(req.Content ?? "").Select(m => Guid.Parse(m.Groups[1].Value))
            .Where(id => a.ParticipantIds.Contains(id) && id != senderId).Distinct().ToList();

        if (req.ReplyToId is Guid replyId && (await messages.GetAsync(replyId, ct))?.ConversationId != conversationId)
            return new Error("Message.InvalidReply", "Tin được trả lời không nằm trong hội thoại này.");

        // check file đính kèm với Media
        var attachments = new List<MessageAttachment>();
        if (req.AttachmentIds is { Count: > 0 } ids)
        {
            var files = await media.GetOwnedFilesAsync(senderId, ids.Distinct().ToList(), ct);
            if (files.Count != ids.Distinct().Count())
                return Error.NotFound("Message.FileNotFound", "Có file đính kèm không tồn tại hoặc không phải của bạn.");
            attachments.AddRange(files.Select(f => MessageAttachment.Create(f.Id, f.FileName, f.ContentType, f.SizeBytes)));
        }

        var created = Message.Create(conversationId, senderId, req.Content ?? "", mentioned, attachments, req.ReplyToId);
        if (created.IsFailure) return created.Error;
        var message = created.Value;
        await messages.AddAsync(message, ct);
        await uow.SaveChangesAsync(ct);

        // realtime, thông báo do các handler của MessageSent lo
        await bus.PublishAsync(new MessageSent(
            message.Id, conversationId, a.Conversation.ServerId, senderId, message.Content, message.CreatedAt, a.Conversation.IsDirect,
            a.ParticipantIds.Where(p => p != senderId).ToList(), mentioned), ct);
        return Result.Success(await factory.ToDtoAsync(message, false, ct));
    }

    public async Task<Result<IReadOnlyList<MessageDto>>> HistoryAsync(Guid userId, Guid conversationId, DateTime? before, int take, CancellationToken ct)
    {
        var a = await access.CheckAsync(conversationId, userId, ct);
        if (a is null) return NotFound;
        if (!a.CanRead) return NoAccess;
        var clearedAt = (await conversations.GetMemberAsync(conversationId, userId, ct))?.ClearedAt;
        var pinned = (await messages.ListPinsAsync(conversationId, ct)).Select(p => p.MessageId).ToHashSet();
        var list = await messages.ListAsync(conversationId, before, clearedAt, Math.Clamp(take, 1, 100), ct);
        return Result.Success(await factory.ToDtosAsync(list, pinned, ct));
    }

    public async Task<Result<MessagePageDto>> PageAsync(Guid userId, Guid conversationId, Guid? beforeId, int take, CancellationToken ct)
    {
        DateTime? before = null;
        if (beforeId is Guid id)
        {
            var anchor = await messages.GetAsync(id, ct);
            if (anchor is null || anchor.ConversationId != conversationId) return Error.NotFound("Message.NotFound", "Không tìm thấy tin nhắn mốc.");
            before = anchor.CreatedAt;
        }
        take = Math.Clamp(take, 1, 100);
        var r = await HistoryAsync(userId, conversationId, before, take + 1, ct);
        if (r.IsFailure) return r.Error;
        var newestFirst = r.Value;
        var page = newestFirst.Take(take).Reverse().ToList();
        return Result.Success(new MessagePageDto(page, newestFirst.Count > take));
    }

    public async Task<Result<MessageDto>> GetAsync(Guid userId, Guid messageId, CancellationToken ct)
    {
        var (message, a, error) = await LoadAsync(userId, messageId, ct);
        if (error is not null) return error;
        var isPinned = await messages.GetPinAsync(message!.ConversationId, messageId, ct) is not null;
        return Result.Success(await factory.ToDtoAsync(message, isPinned, ct));
    }

    public async Task<Result<MessageDto>> EditAsync(Guid userId, Guid messageId, string content, CancellationToken ct)
    {
        var (message, a, error) = await LoadAsync(userId, messageId, ct);
        if (error is not null) return error;
        var r = message!.Edit(userId, content);
        if (r.IsFailure) return r.Error;
        await uow.SaveChangesAsync(ct);
        await PublishChangedAsync(message, a!, "edited", ct);
        return Result.Success(await factory.ToDtoAsync(message, false, ct));
    }

    public async Task<Result> DeleteAsync(Guid userId, Guid messageId, CancellationToken ct)
    {
        var (message, a, error) = await LoadAsync(userId, messageId, ct);
        if (error is not null) return Result.Failure(error);
        var r = message!.Delete(userId, a!.CanModerate);
        if (r.IsFailure) return r;
        if (await messages.GetPinAsync(message.ConversationId, messageId, ct) is { } pin) messages.RemovePin(pin);
        await uow.SaveChangesAsync(ct);
        await PublishChangedAsync(message, a, "deleted", ct);
        return Result.Success();
    }

    public async Task<Result> ReactAsync(Guid userId, Guid messageId, string emoji, CancellationToken ct)
    {
        var (message, a, error) = await LoadAsync(userId, messageId, ct);
        if (error is not null) return Result.Failure(error);
        var r = message!.ToggleReaction(userId, emoji);
        if (r.IsFailure) return r;
        await uow.SaveChangesAsync(ct);
        await PublishChangedAsync(message, a!, "reaction", ct);
        return Result.Success();
    }

    public async Task<Result> PinAsync(Guid userId, Guid messageId, bool pinned, CancellationToken ct)
    {
        var (message, a, error) = await LoadAsync(userId, messageId, ct);
        if (error is not null) return Result.Failure(error);
        if (!a!.Conversation.IsDirect && !a.CanModerate) return Result.Failure(Error.Forbidden("Message.NoPinPermission", "Chỉ chủ server/quản trị viên mới ghim được tin."));
        if (message!.IsDeleted) return Result.Failure(Error.NotFound("Message.Deleted", "Tin nhắn đã bị xóa."));

        var existing = await messages.GetPinAsync(message.ConversationId, messageId, ct);
        if (pinned && existing is null) await messages.AddPinAsync(PinnedMessage.Create(message.ConversationId, messageId, userId), ct);
        if (!pinned && existing is not null) messages.RemovePin(existing);
        await uow.SaveChangesAsync(ct);
        await PublishChangedAsync(message, a, pinned ? "pinned" : "unpinned", ct);
        return Result.Success();
    }

    public async Task<Result<IReadOnlyList<MessageDto>>> PinnedAsync(Guid userId, Guid conversationId, CancellationToken ct)
    {
        var a = await access.CheckAsync(conversationId, userId, ct);
        if (a is null) return NotFound;
        if (!a.CanRead) return NoAccess;
        var result = new List<MessageDto>();
        foreach (var pin in (await messages.ListPinsAsync(conversationId, ct)).OrderByDescending(p => p.PinnedAt))
            if (await messages.GetAsync(pin.MessageId, ct) is { } m) result.Add(await factory.ToDtoAsync(m, true, ct));
        return Result.Success<IReadOnlyList<MessageDto>>(result);
    }

    public async Task<Result> MarkReadAsync(Guid userId, Guid conversationId, CancellationToken ct)
    {
        var a = await access.CheckAsync(conversationId, userId, ct);
        if (a is null) return Result.Failure(NotFound);
        if (!a.CanRead) return Result.Failure(NoAccess);
        var state = await conversations.GetMemberAsync(conversationId, userId, ct);
        if (state is null) { state = ConversationMember.Create(conversationId, userId); await conversations.AddMemberAsync(state, ct); }
        state.MarkRead();
        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<IReadOnlyList<MessageDto>> SearchAsync(Guid userId, string? keyword, Guid? senderId, Guid? conversationId,
        DateTime? from, DateTime? to, int skip, int take, CancellationToken ct)
    {
        var serverIds = await organization.GetReadableServerIdsAsync(userId, ct);
        var query = new SearchQuery(userId, serverIds, keyword, senderId, conversationId, from, to, Math.Max(0, skip), Math.Clamp(take, 1, 100));
        return await factory.ToDtosAsync(await messages.SearchAsync(query, ct), null, ct);
    }

    private async Task<(Message? Message, AccessResult? Access, Error? Error)> LoadAsync(Guid userId, Guid messageId, CancellationToken ct)
    {
        var message = await messages.GetAsync(messageId, ct);
        if (message is null) return (null, null, MessageNotFound);
        var a = await access.CheckAsync(message.ConversationId, userId, ct);
        if (a is null || !a.CanRead) return (null, null, NoAccess);
        return (message, a, null);
    }

    private Task PublishChangedAsync(Message m, AccessResult a, string change, CancellationToken ct)
        => bus.PublishAsync(new MessageChanged(m.Id, m.ConversationId, change, a.ParticipantIds), ct).AsTask();
}
