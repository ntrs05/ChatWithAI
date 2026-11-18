using Nebula.Messaging.Domain;

namespace Nebula.Messaging.Application;

public interface IMessagingUnitOfWork : Nebula.Shared.Kernel.IUnitOfWork { }

public sealed record DirectRow(Conversation Conversation, ConversationMember? State, DateTime? LastMessageAt);

public interface IConversationRepository
{
    Task<Conversation?> GetAsync(Guid conversationId, CancellationToken ct);
    Task<Conversation?> GetDirectAsync(string directKey, CancellationToken ct);
    Task<IReadOnlyList<Conversation>> ListChannelsAsync(Guid serverId, CancellationToken ct);
    Task<IReadOnlyList<DirectRow>> ListDirectForUserAsync(Guid userId, CancellationToken ct);
    Task AddAsync(Conversation conversation, CancellationToken ct);
    void Remove(Conversation conversation);

    Task<IReadOnlyList<Category>> ListCategoriesAsync(Guid serverId, CancellationToken ct);
    Task<Category?> GetCategoryAsync(Guid categoryId, CancellationToken ct);
    Task AddCategoryAsync(Category category, CancellationToken ct);
    void RemoveCategory(Category category);

    Task<ConversationMember?> GetMemberAsync(Guid conversationId, Guid userId, CancellationToken ct);
    Task AddMemberAsync(ConversationMember member, CancellationToken ct);

    // thành viên kênh riêng tư
    Task<IReadOnlyList<Guid>> ListChannelMemberIdsAsync(Guid conversationId, CancellationToken ct);
    Task<IReadOnlyList<ChannelMember>> ListChannelMembersAsync(IReadOnlyCollection<Guid> conversationIds, CancellationToken ct);
    Task<ChannelMember?> GetChannelMemberAsync(Guid conversationId, Guid userId, CancellationToken ct);
    Task AddChannelMemberAsync(ChannelMember member, CancellationToken ct);
    void RemoveChannelMember(ChannelMember member);
    Task ClearChannelMembersAsync(Guid conversationId, CancellationToken ct);

    Task DeleteServerDataAsync(Guid serverId, CancellationToken ct);
}

public sealed record SearchQuery(
    Guid UserId, IReadOnlyList<Guid> ReadableServerIds, string? Keyword, Guid? SenderId, Guid? ConversationId,
    DateTime? From, DateTime? To, int Skip, int Take);

public interface IMessageRepository
{
    Task<Message?> GetAsync(Guid messageId, CancellationToken ct);
    Task<IReadOnlyList<Message>> ListAsync(Guid conversationId, DateTime? before, DateTime? after, int take, CancellationToken ct);
    Task<IReadOnlyList<Message>> SearchAsync(SearchQuery query, CancellationToken ct);
    Task AddAsync(Message message, CancellationToken ct);

    Task<IReadOnlyList<PinnedMessage>> ListPinsAsync(Guid conversationId, CancellationToken ct);
    Task<PinnedMessage?> GetPinAsync(Guid conversationId, Guid messageId, CancellationToken ct);
    Task AddPinAsync(PinnedMessage pin, CancellationToken ct);
    void RemovePin(PinnedMessage pin);
}
