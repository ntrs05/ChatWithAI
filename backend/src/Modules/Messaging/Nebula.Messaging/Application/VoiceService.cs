using System.Text.Json;
using Nebula.Messaging.Domain;
using Nebula.Shared.Contracts;
using Nebula.Shared.Kernel;

namespace Nebula.Messaging.Application;

/// <summary>Một "client" (một tab trình duyệt) đang ở trong kênh thoại. Chỉ lưu trong bộ nhớ: khởi động lại server thì mọi người phải vào lại,
/// điều này chấp nhận được vì kết nối âm thanh cũng đứt theo.</summary>
public sealed record VoiceStateRow(Guid ChannelId, Guid ServerId, Guid UserId, string ClientId, bool Muted, bool Deafened, DateTime JoinedAt);

public interface IVoiceStateStore
{
    /// <summary>Thêm client vào kênh; client đang ở kênh khác thì bị đưa ra khỏi kênh đó. Trả về các dòng cũ bị thay.</summary>
    IReadOnlyList<VoiceStateRow> Join(VoiceStateRow row);
    VoiceStateRow? Get(Guid channelId, string clientId);
    /// <summary>Client này (ở bất kỳ kênh nào) đang thuộc về ai, nếu có.</summary>
    VoiceStateRow? FindByClient(string clientId);
    VoiceStateRow? Remove(Guid channelId, string clientId);
    VoiceStateRow? Update(Guid channelId, string clientId, bool muted, bool deafened);
    IReadOnlyList<VoiceStateRow> RemoveWhere(Func<VoiceStateRow, bool> predicate);
    IReadOnlyList<VoiceStateRow> ListByServer(Guid serverId);
    IReadOnlyList<VoiceStateRow> ListByChannel(Guid channelId);
}

public sealed record VoiceJoinRequest(string ClientId, bool Muted, bool Deafened);
public sealed record VoiceLeaveRequest(string ClientId);

/// <summary>Tín hiệu WebRTC (offer/answer/ICE). Server chỉ chuyển tiếp, âm thanh đi thẳng giữa các trình duyệt.</summary>
public sealed record VoiceSignalDto(Guid ChannelId, string From, string? To, JsonElement Data);

/// <summary>Kênh thoại: ai đang ở trong kênh nào (presence) và chuyển tiếp tín hiệu WebRTC.
/// Quyền vào kênh dùng chung luật với kênh chat (ConversationAccess).</summary>
public sealed class VoiceService(
    IConversationRepository conversations, ConversationAccess access, IOrganizationApi organization,
    IIdentityApi identity, IVoiceStateStore store, IRealtimeGateway gateway)
{
    public async Task<Result<VoiceParticipantDto>> JoinAsync(Guid userId, Guid channelId, VoiceJoinRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.ClientId) || req.ClientId.Length > 64) return new Error("Voice.InvalidClient", "clientId không hợp lệ.");
        var channel = await conversations.GetAsync(channelId, ct);
        if (channel is null || channel.IsDirect || channel.Kind != ChannelKind.Voice) return Error.NotFound("Voice.NotFound", "Không tìm thấy kênh thoại.");
        var a = await access.CheckAsync(channelId, userId, ct);
        if (a is null || !a.CanRead) return Error.Forbidden("Voice.NoAccess", "Bạn không có quyền vào kênh này.");

        // clientId đang thuộc về người khác thì không cho chiếm (chặn đá người khác ra khỏi kênh bằng cách đoán clientId).
        if (store.FindByClient(req.ClientId) is { } owner && owner.UserId != userId)
            return Error.Forbidden("Voice.ClientTaken", "clientId này đang được dùng bởi người khác.");

        var serverId = channel.ServerId!.Value;
        var row = new VoiceStateRow(channelId, serverId, userId, req.ClientId, req.Muted, req.Deafened, DateTime.UtcNow);
        var replaced = store.Join(row);
        foreach (var old in replaced) await PushLeftAsync(old, ct);

        var dto = (await ToDtosAsync([row], ct))[0];
        await PushToServerAsync(serverId, "VoiceJoined", new { participant = dto }, ct);
        return Result.Success(dto);
    }

    public async Task<Result> LeaveAsync(Guid userId, Guid channelId, string clientId, CancellationToken ct)
    {
        var row = store.Get(channelId, clientId);
        if (row is null) return Result.Success();                                  // đã rời rồi: coi như xong
        if (row.UserId != userId) return Result.Failure(Error.Forbidden("Voice.NotYours", "Đây không phải kết nối của bạn."));
        store.Remove(channelId, clientId);
        await PushLeftAsync(row, ct);
        return Result.Success();
    }

    public async Task<Result> UpdateAsync(Guid userId, Guid channelId, string clientId, bool muted, bool deafened, CancellationToken ct)
    {
        var row = store.Get(channelId, clientId);
        if (row is null) return Result.Failure(Error.NotFound("Voice.NotJoined", "Bạn chưa ở trong kênh thoại này."));
        if (row.UserId != userId) return Result.Failure(Error.Forbidden("Voice.NotYours", "Đây không phải kết nối của bạn."));
        var updated = store.Update(channelId, clientId, muted, deafened)!;
        await PushToServerAsync(updated.ServerId, "VoiceUpdated", new { participant = (await ToDtosAsync([updated], ct))[0] }, ct);
        return Result.Success();
    }

    /// <summary>Ai đang ở trong các kênh thoại của server (để hiện dưới tên kênh).</summary>
    public async Task<Result<IReadOnlyList<VoiceParticipantDto>>> ListAsync(Guid userId, Guid serverId, CancellationToken ct)
    {
        var g = await organization.GetAccessAsync(serverId, userId, ct);
        if (!g.Exists) return Error.NotFound("Server.NotFound", "Không tìm thấy server.");
        if (!g.CanRead) return Error.Forbidden("Server.NoAccess", "Bạn không thuộc server này.");
        return Result.Success(await ToDtosAsync(store.ListByServer(serverId), ct));
    }

    /// <summary>Chuyển tín hiệu WebRTC tới người khác trong kênh. Người gửi phải đang ở trong kênh bằng đúng clientId đó.</summary>
    public async Task RelaySignalAsync(Guid userId, VoiceSignalDto signal, CancellationToken ct)
    {
        var sender = store.Get(signal.ChannelId, signal.From);
        if (sender is null || sender.UserId != userId) return;
        var targets = store.ListByChannel(signal.ChannelId)
            .Where(r => r.ClientId != signal.From && (signal.To is null || r.ClientId == signal.To))
            .Select(r => r.UserId).Distinct().ToList();
        if (targets.Count > 0)
            await gateway.PushToUsersAsync(targets, "VoiceSignal", new { signal.ChannelId, signal.From, signal.To, signal.Data }, ct);
    }

    /// <summary>Gọi khi người dùng mất kết nối / bị xóa khỏi server / server bị xóa: dọn trạng thái và báo mọi người.</summary>
    public async Task RemoveAsync(Func<VoiceStateRow, bool> predicate, CancellationToken ct)
    {
        foreach (var row in store.RemoveWhere(predicate)) await PushLeftAsync(row, ct);
    }

    private Task PushLeftAsync(VoiceStateRow row, CancellationToken ct)
        => PushToServerAsync(row.ServerId, "VoiceLeft", new { channelId = row.ChannelId, serverId = row.ServerId, clientId = row.ClientId }, ct);

    private async Task PushToServerAsync(Guid serverId, string eventName, object payload, CancellationToken ct)
        => await gateway.PushToUsersAsync(await organization.GetMemberIdsAsync(serverId, ct), eventName, payload, ct);

    private async Task<IReadOnlyList<VoiceParticipantDto>> ToDtosAsync(IReadOnlyList<VoiceStateRow> rows, CancellationToken ct)
    {
        var users = await identity.GetUsersAsync(rows.Select(r => r.UserId).ToList(), ct);
        return rows.Select(r => new VoiceParticipantDto(r.ChannelId, r.ServerId, MessageDtoFactory.AuthorOf(users, r.UserId),
            r.ClientId, r.Muted, r.Deafened, r.JoinedAt)).ToList();
    }
}
