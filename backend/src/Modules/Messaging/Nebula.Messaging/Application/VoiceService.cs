namespace Nebula.Messaging.Application;

// TODO: các trường (Guid ChannelId, Guid ServerId, Guid UserId, string ClientId, bool Muted, bool Deafened, DateTime JoinedAt)
public sealed record VoiceStateRow
{
}

public interface IVoiceStateStore
{
}

// TODO: request gồm (string ClientId, bool Muted, bool Deafened)
public sealed record VoiceJoinRequest
{
}

// TODO: request gồm (string ClientId)
public sealed record VoiceLeaveRequest
{
}

// TODO: các trường (Guid ChannelId, string From, string? To, JsonElement Data)
public sealed record VoiceSignalDto
{
}

// TODO: JoinAsync, LeaveAsync, UpdateAsync, ListAsync, RelaySignalAsync, RemoveAsync
public sealed class VoiceService
{
}
