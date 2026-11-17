namespace Nebula.Messaging.Application;

public interface IMessagingUnitOfWork
{
}

// TODO: các trường (Conversation Conversation, ConversationMember? State, DateTime? LastMessageAt)
public sealed record DirectRow
{
}

public interface IConversationRepository
{
}

// TODO: các trường (Guid UserId, IReadOnlyList<Guid> ReadableServerIds, string? Keyword, Guid? SenderId, Guid? ConversationId, DateTime? From, DateTime? To, int Skip, int Take)
public sealed record SearchQuery
{
}

public interface IMessageRepository
{
}
