using Nebula.Messaging.Domain;
using Nebula.Shared.Contracts;
using Nebula.Shared.Kernel;

namespace Nebula.Messaging.Application;

public sealed record CreateCategoryRequest(string Name);
/// <param name="IsPrivate">Kênh riêng tư: chỉ chủ server và những người trong MemberIds mới thấy.</param>
public sealed record CreateChannelRequest(string Name, ChannelKind Kind, Guid? CategoryId, string? Topic = null, bool IsPrivate = false, IReadOnlyList<Guid>? MemberIds = null);
/// <param name="IsPrivate">null = giữ nguyên. Đổi sang riêng tư thì chỉ còn chủ server; đổi sang công khai thì xóa danh sách thành viên.</param>
public sealed record UpdateChannelRequest(string Name, string? Topic, bool? IsPrivate = null);
public sealed record ChannelMemberRequest(Guid UserId);

/// <summary>Category và kênh trong server. Ai được quản lý kênh: hỏi Organization (CanManage = chủ server).</summary>
public sealed class ChannelService(IConversationRepository conversations, IOrganizationApi organization, IIdentityApi identity, IMessagingUnitOfWork uow, IEventBus bus)
{
    private static readonly Error NoManage = Error.Forbidden("Channel.NoPermission", "Chỉ chủ server mới quản lý được kênh.");
    private static readonly Error ChannelNotFound = Error.NotFound("Channel.NotFound", "Không tìm thấy kênh.");

    public async Task<Result<ServerChannelsDto>> ListAsync(Guid userId, Guid serverId, CancellationToken ct)
    {
        var access = await organization.GetAccessAsync(serverId, userId, ct);
        if (!access.Exists) return Error.NotFound("Server.NotFound", "Không tìm thấy server.");
        if (!access.CanRead) return Error.Forbidden("Server.NoAccess", "Bạn không thuộc server này.");

        var categories = await conversations.ListCategoriesAsync(serverId, ct);
        var channels = (await conversations.ListChannelsAsync(serverId, ct)).OrderBy(c => c.Position).ToList();

        // Kênh riêng tư chỉ hiện với chủ server và những người có tên trong danh sách của kênh.
        if (!access.CanManage)
        {
            var privateIds = channels.Where(c => c.IsPrivate).Select(c => c.Id).ToList();
            if (privateIds.Count > 0)
            {
                var mine = (await conversations.ListChannelMembersAsync(privateIds, ct)).Where(m => m.UserId == userId).Select(m => m.ConversationId).ToHashSet();
                channels = channels.Where(c => !c.IsPrivate || mine.Contains(c.Id)).ToList();
            }
        }
        return Result.Success(new ServerChannelsDto(serverId,
            categories.OrderBy(c => c.Position).Select(cat => new CategoryDto(cat.Id, cat.Name, cat.Position,
                channels.Where(ch => ch.CategoryId == cat.Id).Select(ChannelDto.From).ToList())).ToList(),
            channels.Where(ch => ch.CategoryId is null).Select(ChannelDto.From).ToList()));
    }

    public async Task<Result<CategoryDto>> CreateCategoryAsync(Guid userId, Guid serverId, string name, CancellationToken ct)
    {
        if (!(await organization.GetAccessAsync(serverId, userId, ct)).CanManage) return NoManage;
        var position = (await conversations.ListCategoriesAsync(serverId, ct)).Count;
        var created = Category.Create(serverId, name, position);
        if (created.IsFailure) return created.Error;
        await conversations.AddCategoryAsync(created.Value, ct);
        await uow.SaveChangesAsync(ct);
        return Result.Success(new CategoryDto(created.Value.Id, created.Value.Name, created.Value.Position, []));
    }

    /// <summary>Chỉ xóa được category rỗng, tránh xóa nhầm cả loạt kênh.</summary>
    public async Task<Result> DeleteCategoryAsync(Guid userId, Guid categoryId, CancellationToken ct)
    {
        var category = await conversations.GetCategoryAsync(categoryId, ct);
        if (category is null) return Result.Failure(Error.NotFound("Category.NotFound", "Không tìm thấy category."));
        if (!(await organization.GetAccessAsync(category.ServerId, userId, ct)).CanManage) return Result.Failure(NoManage);
        if ((await conversations.ListChannelsAsync(category.ServerId, ct)).Any(c => c.CategoryId == categoryId))
            return Result.Failure(Error.Conflict("Category.NotEmpty", "Hãy xóa hết kênh trong category trước."));
        conversations.RemoveCategory(category);
        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result<ChannelDto>> CreateChannelAsync(Guid userId, Guid serverId, CreateChannelRequest req, CancellationToken ct)
    {
        if (!(await organization.GetAccessAsync(serverId, userId, ct)).CanManage) return NoManage;
        if (req.CategoryId is Guid catId && (await conversations.GetCategoryAsync(catId, ct))?.ServerId != serverId)
            return Error.NotFound("Category.NotFound", "Category không thuộc server này.");

        var position = (await conversations.ListChannelsAsync(serverId, ct)).Count;
        var created = Conversation.CreateChannel(serverId, req.CategoryId, req.Name, req.Kind, userId, position, req.IsPrivate);
        if (created.IsFailure) return created.Error;
        if (req.Topic is not null)
        {
            var topic = created.Value.UpdateChannel(req.Name, req.Topic);
            if (topic.IsFailure) return topic.Error;
        }
        await conversations.AddAsync(created.Value, ct);

        var serverMembers = await organization.GetMemberIdsAsync(serverId, ct);
        IReadOnlyList<Guid> notify = serverMembers;
        if (req.IsPrivate)
        {
            // Người tạo (chủ server) luôn nằm trong danh sách; người khác phải là thành viên server.
            var chosen = (req.MemberIds ?? []).Append(userId).Distinct().Where(id => serverMembers.Contains(id)).ToList();
            foreach (var id in chosen) await conversations.AddChannelMemberAsync(ChannelMember.Create(created.Value.Id, id), ct);
            notify = chosen;
        }
        await uow.SaveChangesAsync(ct);
        // Realtime: những người thấy được kênh này cập nhật thanh bên ngay.
        await bus.PublishAsync(new ChannelCreated(created.Value.Id, serverId, notify), ct);
        return Result.Success(ChannelDto.From(created.Value));
    }

    public async Task<Result<ChannelDto>> UpdateChannelAsync(Guid userId, Guid channelId, UpdateChannelRequest req, CancellationToken ct)
    {
        var channel = await conversations.GetAsync(channelId, ct);
        if (channel is null || channel.IsDirect) return ChannelNotFound;
        if (!(await organization.GetAccessAsync(channel.ServerId!.Value, userId, ct)).CanManage) return NoManage;
        var r = channel.UpdateChannel(req.Name, req.Topic);
        if (r.IsFailure) return r.Error;

        if (req.IsPrivate is bool makePrivate && makePrivate != channel.IsPrivate)
        {
            var serverId = channel.ServerId!.Value;
            var everyone = await organization.GetMemberIdsAsync(serverId, ct);
            if (makePrivate)
            {
                // Chuyển sang riêng tư: chỉ còn người đang thao tác (chủ server) trong danh sách.
                channel.SetPrivate(true);
                await conversations.AddChannelMemberAsync(ChannelMember.Create(channel.Id, userId), ct);
                await uow.SaveChangesAsync(ct);
                await bus.PublishAsync(new ChannelRemoved(channel.Id, serverId, everyone.Where(id => id != userId).ToList()), ct);
                return Result.Success(ChannelDto.From(channel));
            }
            channel.SetPrivate(false);
            await conversations.ClearChannelMembersAsync(channel.Id, ct);
            await uow.SaveChangesAsync(ct);
            await bus.PublishAsync(new ChannelCreated(channel.Id, serverId, everyone), ct);   // ai chưa thấy thì giờ thấy
            return Result.Success(ChannelDto.From(channel));
        }
        await uow.SaveChangesAsync(ct);
        return Result.Success(ChannelDto.From(channel));
    }

    // ---- Thành viên của kênh riêng tư (chỉ chủ server quản lý) ----

    private async Task<(Conversation? Channel, Error? Error)> OwnedPrivateChannelAsync(Guid userId, Guid channelId, CancellationToken ct)
    {
        var channel = await conversations.GetAsync(channelId, ct);
        if (channel is null || channel.IsDirect) return (null, ChannelNotFound);
        if (!(await organization.GetAccessAsync(channel.ServerId!.Value, userId, ct)).CanManage) return (null, NoManage);
        if (!channel.IsPrivate) return (null, new Error("Channel.NotPrivate", "Đây không phải kênh riêng tư."));
        return (channel, null);
    }

    public async Task<Result<IReadOnlyList<AuthorDto>>> ListMembersAsync(Guid userId, Guid channelId, CancellationToken ct)
    {
        var (channel, error) = await OwnedPrivateChannelAsync(userId, channelId, ct);
        if (error is not null) return error;
        var ids = await conversations.ListChannelMemberIdsAsync(channel!.Id, ct);
        var users = await identity.GetUsersAsync(ids.ToList(), ct);
        IReadOnlyList<AuthorDto> list = ids.Where(id => users.ContainsKey(id)).Select(id => users[id])
            .Select(u => new AuthorDto(u.Id, u.DisplayName, u.Username, u.AvatarUrl)).ToList();
        return Result.Success(list);
    }

    public async Task<Result> AddMemberAsync(Guid userId, Guid channelId, Guid targetId, CancellationToken ct)
    {
        var (channel, error) = await OwnedPrivateChannelAsync(userId, channelId, ct);
        if (error is not null) return Result.Failure(error);
        var serverId = channel!.ServerId!.Value;
        if (!(await organization.GetMemberIdsAsync(serverId, ct)).Contains(targetId))
            return Result.Failure(new Error("Channel.NotServerMember", "Người này chưa ở trong server."));
        if (await conversations.GetChannelMemberAsync(channel.Id, targetId, ct) is not null) return Result.Success();
        await conversations.AddChannelMemberAsync(ChannelMember.Create(channel.Id, targetId), ct);
        await uow.SaveChangesAsync(ct);
        await bus.PublishAsync(new ChannelCreated(channel.Id, serverId, [targetId]), ct);   // kênh hiện ra trong thanh bên của họ
        return Result.Success();
    }

    public async Task<Result> RemoveMemberAsync(Guid userId, Guid channelId, Guid targetId, CancellationToken ct)
    {
        var (channel, error) = await OwnedPrivateChannelAsync(userId, channelId, ct);
        if (error is not null) return Result.Failure(error);
        if (targetId == userId) return Result.Failure(new Error("Channel.CannotRemoveSelf", "Chủ server luôn ở trong kênh riêng tư của mình."));
        var member = await conversations.GetChannelMemberAsync(channel!.Id, targetId, ct);
        if (member is null) return Result.Success();
        conversations.RemoveChannelMember(member);
        await uow.SaveChangesAsync(ct);
        await bus.PublishAsync(new ChannelRemoved(channel.Id, channel.ServerId!.Value, [targetId]), ct);
        return Result.Success();
    }

    public async Task<Result> DeleteChannelAsync(Guid userId, Guid channelId, CancellationToken ct)
    {
        var channel = await conversations.GetAsync(channelId, ct);
        if (channel is null || channel.IsDirect) return Result.Failure(ChannelNotFound);
        if (!(await organization.GetAccessAsync(channel.ServerId!.Value, userId, ct)).CanManage) return Result.Failure(NoManage);
        conversations.Remove(channel);   // tin nhắn, ghim của kênh được DB xóa theo (ON DELETE CASCADE)
        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }

    /// <summary>Gọi khi có server mới (event ServerCreated): tạo sẵn "Kênh chat/#general" và "Kênh thoại/General".</summary>
    public async Task CreateDefaultChannelsAsync(Guid serverId, Guid creatorId, CancellationToken ct)
    {
        var chat = Category.Create(serverId, "Kênh chat", 0).Value;
        var voice = Category.Create(serverId, "Kênh thoại", 1).Value;
        await conversations.AddCategoryAsync(chat, ct);
        await conversations.AddCategoryAsync(voice, ct);
        await conversations.AddAsync(Conversation.CreateChannel(serverId, chat.Id, "general", ChannelKind.Text, creatorId, 0).Value, ct);
        await conversations.AddAsync(Conversation.CreateChannel(serverId, voice.Id, "General", ChannelKind.Voice, creatorId, 1).Value, ct);
        await uow.SaveChangesAsync(ct);
    }
}
