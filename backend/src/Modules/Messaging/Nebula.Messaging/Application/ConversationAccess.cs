using Nebula.Messaging.Domain;
using Nebula.Shared.Contracts;

namespace Nebula.Messaging.Application;

public sealed record AccessResult(Conversation Conversation, bool CanRead, bool CanModerate, bool CanManage, IReadOnlyList<Guid> ParticipantIds);

public sealed class ConversationAccess(IConversationRepository conversations, IOrganizationApi organization)
{
    public async Task<AccessResult?> CheckAsync(Guid conversationId, Guid userId, CancellationToken ct)
    {
        var conversation = await conversations.GetAsync(conversationId, ct);
        if (conversation is null) return null;

        if (conversation.IsDirect)
        {
            var participants = conversation.DirectParticipants();
            var inside = participants.Contains(userId);
            // chat 1-1: ai cũng ghim được, không xóa tin người kia
            return new AccessResult(conversation, inside, false, false, participants);
        }

        var serverId = conversation.ServerId!.Value;
        var access = await organization.GetAccessAsync(serverId, userId, ct);
        var members = await organization.GetMemberIdsAsync(serverId, ct);
        if (!conversation.IsPrivate)
            return new AccessResult(conversation, access.CanRead, access.CanModerate, access.CanManage, members);

        // kênh riêng tư: phải là thành viên server và có trong danh sách (chủ server luôn vào được)
        var allowed = await conversations.ListChannelMemberIdsAsync(conversation.Id, ct);
        var canRead = access.CanRead && (access.CanManage || allowed.Contains(userId));
        return new AccessResult(conversation, canRead, canRead && access.CanModerate, access.CanManage, allowed.Where(id => members.Contains(id)).ToList());
    }
}
