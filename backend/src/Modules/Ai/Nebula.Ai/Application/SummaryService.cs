namespace Nebula.Ai.Application;

// TODO: request gồm (Guid ChannelId, string Mode = "auto", int? Limit = null, int? SinceMinutes = null, string? Prompt = null)
public sealed record SummarizeRequest
{
}

// TODO: các trường (string Name, int Count)
public sealed record ParticipantCount
{
}

// TODO: các trường (DateTime From, DateTime To)
public sealed record TimeRange
{
}

// TODO: các trường (IReadOnlyList<ParticipantCount> Participants, IReadOnlyList<string> Topics, string Overview, IReadOnlyList<string> KeyPoints, IReadOnlyList<string> ActionItems, IReadOnlyList<string> Questions, TimeRange? TimeRange)
public sealed record SummaryContent
{
}

// TODO: các trường (Guid ChannelId, DateTime GeneratedAt, string Model, int MessageCount, TimeRange? TimeRange, string Scope, IReadOnlyList<ParticipantCount> Participants, IReadOnlyList<string> Topics, string Overview, IReadOnlyList<string> KeyPoints, IReadOnlyList<string> ActionItems, IReadOnlyList<string> Questions)
public sealed record SummaryDto
{
}

public interface ISummarizer
{
}

public sealed class AiUnavailableException
{
}

// TODO: SummarizeAsync, LatestConversation, ParseDuration
public sealed partial class SummaryService
{
}
