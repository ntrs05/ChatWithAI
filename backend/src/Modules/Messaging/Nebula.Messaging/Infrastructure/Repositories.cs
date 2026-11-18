using Microsoft.EntityFrameworkCore;
using Nebula.Messaging.Application;
using Nebula.Messaging.Domain;

namespace Nebula.Messaging.Infrastructure;

internal sealed class EfConversationRepository(MessagingDbContext db) : IConversationRepository
{
    public Task<Conversation?> GetAsync(Guid conversationId, CancellationToken ct) => db.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId, ct);
    public Task<Conversation?> GetDirectAsync(string directKey, CancellationToken ct) => db.Conversations.FirstOrDefaultAsync(c => c.DirectKey == directKey, ct);

    public async Task<IReadOnlyList<Conversation>> ListChannelsAsync(Guid serverId, CancellationToken ct)
        => await db.Conversations.Where(c => c.ServerId == serverId).OrderBy(c => c.Position).ToListAsync(ct);

    public async Task<IReadOnlyList<DirectRow>> ListDirectForUserAsync(Guid userId, CancellationToken ct)
    {
        var uid = userId.ToString();
        var rows = await db.Conversations.AsNoTracking()
            .Where(c => c.Type == ConversationType.Direct && c.DirectKey!.Contains(uid))
            .Select(c => new
            {
                Conversation = c,
                State = db.ConversationMembers.FirstOrDefault(m => m.ConversationId == c.Id && m.UserId == userId),
                LastMessageAt = db.Messages.Where(m => m.ConversationId == c.Id).Max(m => (DateTime?)m.CreatedAt)
            })
            .ToListAsync(ct);
        return rows.Select(x => new DirectRow(x.Conversation, x.State, x.LastMessageAt)).ToList();
    }

    public async Task AddAsync(Conversation conversation, CancellationToken ct) => await db.Conversations.AddAsync(conversation, ct);
    public void Remove(Conversation conversation) => db.Conversations.Remove(conversation);   // DB tự xóa tin, ghim (cascade)

    public async Task<IReadOnlyList<Category>> ListCategoriesAsync(Guid serverId, CancellationToken ct)
        => await db.Categories.Where(c => c.ServerId == serverId).OrderBy(c => c.Position).ToListAsync(ct);
    public Task<Category?> GetCategoryAsync(Guid categoryId, CancellationToken ct) => db.Categories.FirstOrDefaultAsync(c => c.Id == categoryId, ct);
    public async Task AddCategoryAsync(Category category, CancellationToken ct) => await db.Categories.AddAsync(category, ct);
    public void RemoveCategory(Category category) => db.Categories.Remove(category);

    public Task<ConversationMember?> GetMemberAsync(Guid conversationId, Guid userId, CancellationToken ct)
        => db.ConversationMembers.FirstOrDefaultAsync(m => m.ConversationId == conversationId && m.UserId == userId, ct);
    public async Task AddMemberAsync(ConversationMember member, CancellationToken ct) => await db.ConversationMembers.AddAsync(member, ct);

    public async Task<IReadOnlyList<Guid>> ListChannelMemberIdsAsync(Guid conversationId, CancellationToken ct)
        => await db.ChannelMembers.AsNoTracking().Where(m => m.ConversationId == conversationId).Select(m => m.UserId).ToListAsync(ct);
    public async Task<IReadOnlyList<ChannelMember>> ListChannelMembersAsync(IReadOnlyCollection<Guid> conversationIds, CancellationToken ct)
        => await db.ChannelMembers.AsNoTracking().Where(m => conversationIds.Contains(m.ConversationId)).ToListAsync(ct);
    public Task<ChannelMember?> GetChannelMemberAsync(Guid conversationId, Guid userId, CancellationToken ct)
        => db.ChannelMembers.FirstOrDefaultAsync(m => m.ConversationId == conversationId && m.UserId == userId, ct);
    public async Task AddChannelMemberAsync(ChannelMember member, CancellationToken ct) => await db.ChannelMembers.AddAsync(member, ct);
    public void RemoveChannelMember(ChannelMember member) => db.ChannelMembers.Remove(member);
    public async Task ClearChannelMembersAsync(Guid conversationId, CancellationToken ct)
        => await db.ChannelMembers.Where(m => m.ConversationId == conversationId).ExecuteDeleteAsync(ct);

    public async Task DeleteServerDataAsync(Guid serverId, CancellationToken ct)
    {
        // xóa kênh trước rồi mới xóa category
        await db.Conversations.Where(c => c.ServerId == serverId).ExecuteDeleteAsync(ct);
        await db.Categories.Where(c => c.ServerId == serverId).ExecuteDeleteAsync(ct);
    }
}

internal sealed class EfMessageRepository(MessagingDbContext db) : IMessageRepository
{
    private IQueryable<Message> WithChildren => db.Messages.Include(m => m.Mentions).Include(m => m.Reactions).Include(m => m.Attachments).AsSplitQuery();

    public Task<Message?> GetAsync(Guid messageId, CancellationToken ct) => WithChildren.FirstOrDefaultAsync(m => m.Id == messageId, ct);

    public async Task<IReadOnlyList<Message>> ListAsync(Guid conversationId, DateTime? before, DateTime? after, int take, CancellationToken ct)
        => await WithChildren.AsNoTracking()
            .Where(m => m.ConversationId == conversationId && (before == null || m.CreatedAt < before) && (after == null || m.CreatedAt > after))
            .OrderByDescending(m => m.CreatedAt).Take(take).ToListAsync(ct);

    public async Task<IReadOnlyList<Message>> SearchAsync(SearchQuery q, CancellationToken ct)
    {
        var uid = q.UserId;
        var uidText = uid.ToString();
        var serverIds = q.ReadableServerIds.ToList();

        // 1. hội thoại đọc được: chat 1-1 + kênh của server mình đọc được
        var allowed = db.Conversations
            .Where(c => (c.Type == ConversationType.Direct && c.DirectKey!.Contains(uidText)) || (c.ServerId != null && serverIds.Contains(c.ServerId.Value)
                && (!c.IsPrivate || db.ChannelMembers.Any(cm => cm.ConversationId == c.Id && cm.UserId == uid))))
            .Select(c => c.Id);
        var query = WithChildren.AsNoTracking().Where(m => m.DeletedAt == null && allowed.Contains(m.ConversationId));

        // 2. bỏ tin đã xóa phía mình
        query = query.Where(m => !db.ConversationMembers.Any(s =>
            s.ConversationId == m.ConversationId && s.UserId == uid && s.ClearedAt != null && m.CreatedAt <= s.ClearedAt));

        // 3. bộ lọc
        if (q.ConversationId is Guid cid) query = query.Where(m => m.ConversationId == cid);
        if (q.SenderId is Guid sid) query = query.Where(m => m.SenderId == sid);
        if (q.From is DateTime from) query = query.Where(m => m.CreatedAt >= from);
        if (q.To is DateTime to) query = query.Where(m => m.CreatedAt <= to);
        if (!string.IsNullOrWhiteSpace(q.Keyword)) query = query.Where(m => m.Content.Contains(q.Keyword));

        return await query.OrderByDescending(m => m.CreatedAt).Skip(q.Skip).Take(q.Take).ToListAsync(ct);
    }

    public async Task AddAsync(Message message, CancellationToken ct) => await db.Messages.AddAsync(message, ct);

    public async Task<IReadOnlyList<PinnedMessage>> ListPinsAsync(Guid conversationId, CancellationToken ct)
        => await db.PinnedMessages.AsNoTracking().Where(p => p.ConversationId == conversationId).ToListAsync(ct);
    public Task<PinnedMessage?> GetPinAsync(Guid conversationId, Guid messageId, CancellationToken ct)
        => db.PinnedMessages.FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.MessageId == messageId, ct);
    public async Task AddPinAsync(PinnedMessage pin, CancellationToken ct) => await db.PinnedMessages.AddAsync(pin, ct);
    public void RemovePin(PinnedMessage pin) => db.PinnedMessages.Remove(pin);
}

internal sealed class InMemoryVoiceStateStore : IVoiceStateStore
{
    private readonly object _gate = new();
    private readonly List<VoiceStateRow> _rows = [];

    public IReadOnlyList<VoiceStateRow> Join(VoiceStateRow row)
    {
        lock (_gate)
        {
            var old = _rows.Where(r => r.ClientId == row.ClientId).ToList();
            _rows.RemoveAll(r => r.ClientId == row.ClientId);
            _rows.Add(row);
            return old;
        }
    }

    public VoiceStateRow? Get(Guid channelId, string clientId)
    {
        lock (_gate) return _rows.FirstOrDefault(r => r.ChannelId == channelId && r.ClientId == clientId);
    }

    public VoiceStateRow? FindByClient(string clientId)
    {
        lock (_gate) return _rows.FirstOrDefault(r => r.ClientId == clientId);
    }

    public VoiceStateRow? Remove(Guid channelId, string clientId)
    {
        lock (_gate)
        {
            var row = _rows.FirstOrDefault(r => r.ChannelId == channelId && r.ClientId == clientId);
            if (row is not null) _rows.Remove(row);
            return row;
        }
    }

    public VoiceStateRow? Update(Guid channelId, string clientId, bool muted, bool deafened)
    {
        lock (_gate)
        {
            var i = _rows.FindIndex(r => r.ChannelId == channelId && r.ClientId == clientId);
            if (i < 0) return null;
            return _rows[i] = _rows[i] with { Muted = muted, Deafened = deafened };
        }
    }

    public IReadOnlyList<VoiceStateRow> RemoveWhere(Func<VoiceStateRow, bool> predicate)
    {
        lock (_gate)
        {
            var removed = _rows.Where(predicate).ToList();
            _rows.RemoveAll(r => removed.Contains(r));
            return removed;
        }
    }

    public IReadOnlyList<VoiceStateRow> ListByServer(Guid serverId) { lock (_gate) return _rows.Where(r => r.ServerId == serverId).ToList(); }
    public IReadOnlyList<VoiceStateRow> ListByChannel(Guid channelId) { lock (_gate) return _rows.Where(r => r.ChannelId == channelId).ToList(); }
}
