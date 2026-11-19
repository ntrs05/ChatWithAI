using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Channels;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Nebula.Shared.Contracts;

namespace Nebula.Ai.Application;

public sealed record BotJob(Guid UserId, Guid ConversationId, Guid MessageId, string Prompt);

public sealed class BotQueue
{
    private readonly Channel<BotJob> _channel = Channel.CreateBounded<BotJob>(
        new BoundedChannelOptions(100) { FullMode = BoundedChannelFullMode.DropWrite, SingleReader = true });
    public bool TryEnqueue(BotJob job) => _channel.Writer.TryWrite(job);
    internal bool TryDequeue(out BotJob? job) => _channel.Reader.TryRead(out job);
    public IAsyncEnumerable<BotJob> ReadAllAsync(CancellationToken ct) => _channel.Reader.ReadAllAsync(ct);
}

public sealed partial class BotMentionHandler(BotQueue queue) : IEventHandler<MessageSent>
{
    [GeneratedRegex(@"^\s*@nebula\b[\s,:]*(?<rest>[\s\S]*)$", RegexOptions.IgnoreCase)]
    private static partial Regex CommandRegex();

    internal static string? ParseCommand(string content)
    {
        var m = CommandRegex().Match(content ?? "");
        return m.Success ? m.Groups["rest"].Value.Trim() : null;
    }

    public Task HandleAsync(MessageSent e, CancellationToken ct)
    {
        if (e.SenderId == BotIdentity.Id || e.IsDirect) return Task.CompletedTask;   // bot chỉ trả lời trong kênh server
        if (ParseCommand(e.Content) is { } prompt) queue.TryEnqueue(new BotJob(e.SenderId, e.ConversationId, e.MessageId, prompt));
        return Task.CompletedTask;
    }
}

public sealed class BotWorker(BotQueue queue, IServiceScopeFactory scopes, ILogger<BotWorker> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await foreach (var job in queue.ReadAllAsync(ct))
        {
            try { await RunAsync(job, ct); }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { break; }
            catch (Exception ex) { log.LogError(ex, "Bot Nebula lỗi khi xử lý tin {MessageId}", job.MessageId); }
        }
    }

    private async Task RunAsync(BotJob job, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var summary = scope.ServiceProvider.GetRequiredService<SummaryService>();
        var messaging = scope.ServiceProvider.GetRequiredService<IMessagingApi>();

        var result = await summary.SummarizeAsync(job.UserId, new SummarizeRequest(job.ConversationId, Prompt: job.Prompt), ct);
        var text = result.IsSuccess ? Format(result.Value) : $"⚠️ {result.Error.Message}";
        await messaging.PostAsBotAsync(job.UserId, job.ConversationId, text, job.MessageId, ct);
    }

    internal static string Format(SummaryDto s)
    {
        var sb = new StringBuilder();
        sb.Append("📝 **Tóm tắt ").Append(s.Scope).Append("** (").Append(s.MessageCount).AppendLine(" tin)");
        if (!string.IsNullOrWhiteSpace(s.Overview)) sb.AppendLine().AppendLine(s.Overview.Trim());
        Section(sb, "Ý chính", s.KeyPoints);
        Section(sb, "Việc cần làm", s.ActionItems);
        Section(sb, "Câu hỏi còn mở", s.Questions);
        return sb.ToString().TrimEnd();
    }

    private static void Section(StringBuilder sb, string title, IReadOnlyList<string> items)
    {
        if (items.Count == 0) return;
        sb.AppendLine().Append("**").Append(title).AppendLine(":**");
        foreach (var i in items.Take(8)) sb.Append("• ").AppendLine(i);
    }
}
