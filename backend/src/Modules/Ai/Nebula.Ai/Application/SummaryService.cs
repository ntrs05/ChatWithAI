using Nebula.Shared.Contracts;
using Nebula.Shared.Kernel;

namespace Nebula.Ai.Application;

public sealed record SummarizeRequest(Guid ChannelId, string Mode = "auto", int? Limit = null, int? SinceMinutes = null, string? Prompt = null);
public sealed record ParticipantCount(string Name, int Count);
public sealed record TimeRange(DateTime From, DateTime To);

public sealed record SummaryContent(
    IReadOnlyList<ParticipantCount> Participants, IReadOnlyList<string> Topics, string Overview,
    IReadOnlyList<string> KeyPoints, IReadOnlyList<string> ActionItems, IReadOnlyList<string> Questions, TimeRange? TimeRange);

public sealed record SummaryDto(
    Guid ChannelId, DateTime GeneratedAt, string Model, int MessageCount, TimeRange? TimeRange, string Scope,
    IReadOnlyList<ParticipantCount> Participants, IReadOnlyList<string> Topics, string Overview,
    IReadOnlyList<string> KeyPoints, IReadOnlyList<string> ActionItems, IReadOnlyList<string> Questions);

public interface ISummarizer
{
    string ModelName { get; }
    Task<SummaryContent> SummarizeAsync(IReadOnlyList<ChatLine> lines, string? instruction, CancellationToken ct);
}

public sealed class AiUnavailableException(string message) : Exception(message);

public sealed partial class SummaryService(IMessagingApi messaging, ISummarizer summarizer)
{
    private static readonly TimeSpan Gap = TimeSpan.FromMinutes(30);
    private const int AutoFetch = 300, AutoMin = 15, MaxSinceMinutes = 7 * 24 * 60;

    public async Task<Result<SummaryDto>> SummarizeAsync(Guid userId, SummarizeRequest req, CancellationToken ct)
    {
        var prompt = req.Prompt?.Trim();
        if (prompt?.Length > 300) prompt = prompt[..300];

        // auto mà gõ "2 giờ qua" thì hiểu là mốc thời gian
        var mode = (req.Mode ?? "auto").ToLowerInvariant();
        int? sinceMin = req.SinceMinutes, limit = req.Limit;
        if (mode == "auto" && ParseDuration(prompt) is int m) { mode = "since"; sinceMin = m; }
        if (mode is not ("auto" or "count" or "since")) mode = "auto";

        int fetch = mode == "count" ? Math.Clamp(limit ?? 50, 5, 300) : AutoFetch;
        DateTime? since = mode == "since" ? DateTime.UtcNow.AddMinutes(-Math.Clamp(sinceMin ?? 60, 1, MaxSinceMinutes)) : null;

        var chat = await messaging.GetRecentChatAsync(userId, req.ChannelId, fetch, since, ct);
        if (!chat.Exists) return Error.NotFound("Ai.ChannelNotFound", "Không tìm thấy kênh.");
        if (!chat.CanRead) return Error.Forbidden("Ai.NoAccess", "Bạn không có quyền đọc kênh này.");
        if (!chat.IsTextChat) return new Error("Ai.NotText", "Chỉ tóm tắt được kênh văn bản.");

        var lines = chat.Lines;
        string scope = mode switch
        {
            "count" => $"{lines.Count} tin gần nhất",
            "since" => $"{DescribeMinutes(Math.Clamp(sinceMin ?? 60, 1, MaxSinceMinutes))} qua",
            _ => "cuộc trò chuyện vừa rồi",
        };
        if (mode == "auto") lines = LatestConversation(lines);

        SummaryContent content;
        try { content = await summarizer.SummarizeAsync(lines, string.IsNullOrEmpty(prompt) ? null : prompt, ct); }
        catch (AiUnavailableException ex) { return new Error("Ai.Unavailable", ex.Message); }
        return Result.Success(new SummaryDto(req.ChannelId, DateTime.UtcNow, summarizer.ModelName, lines.Count, content.TimeRange, scope,
            content.Participants, content.Topics, content.Overview, content.KeyPoints, content.ActionItems, content.Questions));
    }

    internal static IReadOnlyList<ChatLine> LatestConversation(IReadOnlyList<ChatLine> lines)
    {
        if (lines.Count <= AutoMin) return lines;
        var start = lines.Count - 1;
        while (start > 0 && lines[start].CreatedAt - lines[start - 1].CreatedAt <= Gap) start--;
        if (lines.Count - start < AutoMin) start = lines.Count - AutoMin;
        return lines.Skip(start).ToList();
    }

    private static string DescribeMinutes(int m) =>
        m % 1440 == 0 ? $"{m / 1440} ngày" : m % 60 == 0 ? $"{m / 60} giờ" : $"{m} phút";

    internal static int? ParseDuration(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var m = DurationRegex().Match(text.ToLowerInvariant());
        if (!m.Success || !int.TryParse(m.Groups[1].Value, out var n) || n <= 0) return null;
        var unit = m.Groups[2].Value;
        var minutes = unit.StartsWith("ngày") ? n * 1440L : unit is "giờ" or "tiếng" or "h" ? n * 60L : n;
        return (int)Math.Min(minutes, MaxSinceMinutes);
    }

    [System.Text.RegularExpressions.GeneratedRegex(@"(\d{1,4})\s*(phút|giờ|tiếng|ngày|h|p)\b")]
    private static partial System.Text.RegularExpressions.Regex DurationRegex();
}
