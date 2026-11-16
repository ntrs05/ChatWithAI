using Nebula.Messaging.Domain;
using Nebula.Shared.Contracts;

namespace Nebula.Messaging.Application;

/// <summary>Kết quả kiểm tra quyền của một người với một hội thoại.</summary>
/// <param name="ParticipantIds">Những người nhận tin của hội thoại (để đẩy realtime, tạo thông báo).</param>
public sealed record AccessResult(Conversation Conversation, bool CanRead, bool CanModerate, bool CanManage, IReadOnlyList<Guid> ParticipantIds);

/// <summary>
/// Một chỗ duy nhất trả lời "người này làm được gì trong hội thoại này":
/// - Chat 1-1: chỉ 2 người trong cuộc đọc được (admin hệ thống cũng không đọc được).
/// - Kênh server: hỏi module Organization (thành viên server, chủ server / quản trị viên; admin hệ thống không đọc được).
/// - Kênh riêng tư: ngoài điều kiện trên còn phải nằm trong danh sách thành viên của kênh.
/// </summary>
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
            // Trong chat 1-1 hai người ngang hàng: ai cũng ghim được, nhưng không xóa được tin của người kia.
            return new AccessResult(conversation, inside, false, false, participants);
        }

        var serverId = conversation.ServerId!.Value;
        var access = await organization.GetAccessAsync(serverId, userId, ct);
        var members = await organization.GetMemberIdsAsync(serverId, ct);
        if (!conversation.IsPrivate)
            return new AccessResult(conversation, access.CanRead, access.CanModerate, access.CanManage, members);

        // Kênh riêng tư: phải là thành viên server VÀ có tên trong danh sách của kênh (chủ server luôn vào được).
        var allowed = await conversations.ListChannelMemberIdsAsync(conversation.Id, ct);
        var canRead = access.CanRead && (access.CanManage || allowed.Contains(userId));
        return new AccessResult(conversation, canRead, canRead && access.CanModerate, access.CanManage, allowed.Where(id => members.Contains(id)).ToList());
    }
}
