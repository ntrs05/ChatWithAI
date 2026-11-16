using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Nebula.Messaging.Domain;
using Nebula.Shared.Kernel;

namespace Nebula.Messaging.Application;

/// <summary>Địa chỉ + vé để trình duyệt nối vào máy chủ SFU (LiveKit).</summary>
public sealed record SfuTokenDto(string Url, string Token);

/// <summary>
/// Cấp "vé" vào phòng LiveKit cho người đang ở trong kênh thoại. Dùng SFU (máy chủ nhận âm thanh từ mỗi người rồi chia lại)
/// thay cho mesh: mỗi người chỉ gửi 1 luồng lên server thay vì gửi cho từng người, nên phòng đông không bị nghẽn.
/// Chưa cấu hình LIVEKIT_* thì trả lỗi NotFound và giao diện tự dùng lại mesh WebRTC.
/// </summary>
public sealed class VoiceTokenService(IConfiguration cfg, IVoiceStateStore store, ConversationAccess access)
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromHours(2);

    public bool Enabled => !string.IsNullOrWhiteSpace(cfg["Livekit:Url"]) && !string.IsNullOrWhiteSpace(cfg["Livekit:ApiKey"])
        && (cfg["Livekit:ApiSecret"]?.Length ?? 0) >= 32;

    public async Task<Result<SfuTokenDto>> CreateAsync(Guid userId, Guid channelId, string clientId, CancellationToken ct)
    {
        if (!Enabled) return Error.NotFound("Voice.SfuDisabled", "Máy chủ chưa bật SFU (LiveKit).");

        // Chỉ cấp vé cho người đã "vào kênh" bằng đúng clientId này và vẫn còn quyền đọc kênh.
        var row = store.Get(channelId, clientId);
        if (row is null || row.UserId != userId) return Error.Forbidden("Voice.NotJoined", "Bạn chưa ở trong kênh thoại này.");
        var a = await access.CheckAsync(channelId, userId, ct);
        if (a is null || !a.CanRead) return Error.Forbidden("Voice.NoAccess", "Bạn không có quyền vào kênh này.");

        return Result.Success(new SfuTokenDto(cfg["Livekit:Url"]!, Sign(cfg["Livekit:ApiKey"]!, cfg["Livekit:ApiSecret"]!, channelId, clientId, DateTimeOffset.UtcNow)));
    }

    /// <summary>JWT HS256 theo định dạng LiveKit: iss = API key, sub = danh tính, video = quyền trong phòng. Phòng = id kênh.</summary>
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
