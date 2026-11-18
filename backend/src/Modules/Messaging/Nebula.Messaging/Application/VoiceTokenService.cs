using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Nebula.Messaging.Domain;
using Nebula.Shared.Kernel;

namespace Nebula.Messaging.Application;

public sealed record SfuTokenDto(string Url, string Token);

public sealed class VoiceTokenService(IConfiguration cfg, IVoiceStateStore store, ConversationAccess access)
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromHours(2);

    public bool Enabled => !string.IsNullOrWhiteSpace(cfg["Livekit:Url"]) && !string.IsNullOrWhiteSpace(cfg["Livekit:ApiKey"])
        && (cfg["Livekit:ApiSecret"]?.Length ?? 0) >= 32;

    public async Task<Result<SfuTokenDto>> CreateAsync(Guid userId, Guid channelId, string clientId, CancellationToken ct)
    {
        if (!Enabled) return Error.NotFound("Voice.SfuDisabled", "Máy chủ chưa bật SFU (LiveKit).");

        // chỉ cấp token cho người đã vào kênh và còn quyền đọc
        var row = store.Get(channelId, clientId);
        if (row is null || row.UserId != userId) return Error.Forbidden("Voice.NotJoined", "Bạn chưa ở trong kênh thoại này.");
        var a = await access.CheckAsync(channelId, userId, ct);
        if (a is null || !a.CanRead) return Error.Forbidden("Voice.NoAccess", "Bạn không có quyền vào kênh này.");

        return Result.Success(new SfuTokenDto(cfg["Livekit:Url"]!, Sign(cfg["Livekit:ApiKey"]!, cfg["Livekit:ApiSecret"]!, channelId, clientId, DateTimeOffset.UtcNow)));
    }

    internal static string Sign(string apiKey, string secret, Guid channelId, string identity, DateTimeOffset now)
    {
        var header = new { alg = "HS256", typ = "JWT" };
        var payload = new
        {
            iss = apiKey,
            sub = identity,
            nbf = now.AddSeconds(-5).ToUnixTimeSeconds(),
            exp = now.Add(Lifetime).ToUnixTimeSeconds(),
            video = new { room = channelId.ToString("N"), roomJoin = true, canPublish = true, canSubscribe = true, canPublishData = false },
        };
        var signingInput = Encode(JsonSerializer.SerializeToUtf8Bytes(header)) + "." + Encode(JsonSerializer.SerializeToUtf8Bytes(payload));
        var sig = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.ASCII.GetBytes(signingInput));
        return signingInput + "." + Encode(sig);
    }

    private static string Encode(byte[] bytes) => Base64Url.EncodeToString(bytes);
}
