using Nebula.Organization.Domain;
using Nebula.Shared.Contracts;
using Nebula.Shared.Kernel;

namespace Nebula.Organization.Application;

public sealed class ServerService(
    IServerRepository servers, SettingsService settings, IIdentityApi identity, IOrganizationUnitOfWork uow, IEventBus bus)
{
    private static readonly Error ServerNotFound = Error.NotFound("Server.NotFound", "Không tìm thấy server.");
    private static readonly Error UserNotFound = Error.NotFound("User.NotFound", "Người dùng không tồn tại hoặc đã bị khóa.");

    private async Task<Actor> ActorAsync(Guid userId, CancellationToken ct)
        => new(userId, (await identity.GetUserAsync(userId, ct))?.IsAdmin ?? false);

    // ===== Tạo / xem / sửa / xóa server =====

    public async Task<Result<ServerDetailDto>> CreateAsync(Guid actorId, CreateServerRequest req, CancellationToken ct)
    {
        var actor = await ActorAsync(actorId, ct);
        if (!actor.IsAdmin && !await settings.IsEnabledAsync(SystemSetting.AllowUserCreateServers, ct))
            return Error.Forbidden("Server.CreationDisabled", "Admin đã tắt chức năng tạo server.");
        var created = Server.Create(actor, req.Name, req.Description, req.JoinPolicy);
        if (created.IsFailure) return created.Error;

        var server = created.Value;
        await servers.AddAsync(server, ct);
        await uow.SaveChangesAsync(ct);
        // Messaging tự tạo kênh mặc định, Notifications báo cho chủ server, Audit ghi nhật ký.
        await bus.PublishAsync(new ServerCreated(server.Id, server.Name, server.OwnerId, actorId), ct);
        return Result.Success(ServerDetailDto.From(server, actorId));
    }

    public async Task<IReadOnlyList<ServerSummaryDto>> ListMineAsync(Guid userId, CancellationToken ct)
        => (await servers.ListForUserAsync(userId, ct)).Select(g => ServerSummaryDto.From(g, userId)).ToList();

    public async Task<IReadOnlyList<ServerSummaryDto>> ListJoinableAsync(Guid userId, string? keyword, CancellationToken ct)
        => (await servers.ListJoinableAsync(keyword, ct)).Where(g => !g.IsMember(userId) && !g.IsBanned(userId))
            .Select(g => ServerSummaryDto.From(g, userId)).ToList();

    public async Task<IReadOnlyList<ServerSummaryDto>> ListAllAsync(Guid actorId, string? keyword, CancellationToken ct)
        => (await servers.ListAllAsync(keyword, ct)).Select(g => ServerSummaryDto.From(g, actorId)).ToList();

    public async Task<Result<ServerDetailDto>> DetailAsync(Guid actorId, Guid serverId, CancellationToken ct)
    {
        var server = await servers.GetAsync(serverId, ct);
        if (server is null) return ServerNotFound;
        if (!server.IsMember(actorId)) return Error.Forbidden("Server.NoAccess", "Bạn không thuộc server này.");
        return Result.Success(ServerDetailDto.From(server, actorId));
    }

    public Task<Result> UpdateAsync(Guid actorId, Guid serverId, UpdateServerRequest req, CancellationToken ct)
        => ChangeAsync(actorId, serverId, (g, a) => g.Update(a, req.Name, req.Description, req.AvatarUrl, req.JoinPolicy), null, ct);

    public async Task<Result> DeleteAsync(Guid actorId, Guid serverId, CancellationToken ct)
    {
        var server = await servers.GetAsync(serverId, ct);
        if (server is null) return Result.Failure(ServerNotFound);
        var r = server.EnsureCanDelete(await ActorAsync(actorId, ct));
        if (r.IsFailure) return r;

        var memberIds = server.Members.Select(m => m.UserId).ToList();
        servers.Remove(server);
        await uow.SaveChangesAsync(ct);
        // Messaging xóa kênh + tin nhắn của server và báo realtime cho thành viên.
        await bus.PublishAsync(new ServerDeleted(serverId, server.Name, memberIds, actorId), ct);
        return Result.Success();
    }

    // ===== Tham gia server =====

    public async Task<Result<ServerDetailDto>> JoinByCodeAsync(Guid userId, string code, CancellationToken ct)
    {
        var server = string.IsNullOrWhiteSpace(code) ? null : await servers.GetByInviteCodeAsync(code.Trim(), ct);
        if (server is null) return Error.NotFound("Server.InvalidCode", "Mã mời không đúng.");
        return await JoinAsync(server, userId, g => g.JoinWithCode(userId, code), ct);
    }

    public async Task<Result<ServerDetailDto>> JoinOpenAsync(Guid userId, Guid serverId, CancellationToken ct)
    {
        var server = await servers.GetAsync(serverId, ct);
        return server is null ? ServerNotFound : await JoinAsync(server, userId, g => g.JoinOpen(userId), ct);
    }

    private async Task<Result<ServerDetailDto>> JoinAsync(Server server, Guid userId, Func<Server, Result> join, CancellationToken ct)
    {
        if (server.IsMember(userId)) return Result.Success(ServerDetailDto.From(server, userId));   // đã ở trong server: coi như thành công
        var r = join(server);
        if (r.IsFailure) return r.Error;
        await uow.SaveChangesAsync(ct);
        await bus.PublishAsync(new MemberAddedToServer(server.Id, server.Name, userId, userId), ct);
        return Result.Success(ServerDetailDto.From(server, userId));
    }

    public async Task<Result<IReadOnlyList<MemberProfileDto>>> ListMembersAsync(Guid actorId, Guid serverId, CancellationToken ct)
    {
        var server = await servers.GetAsync(serverId, ct);
        if (server is null) return ServerNotFound;
        if (!server.IsMember(actorId))
            return Error.Forbidden("Server.NoAccess", "Bạn không thuộc server này.");
        return Result.Success(await ToProfilesAsync(server, ct));
    }

    public async Task<IReadOnlyList<MemberProfileDto>> ToProfilesAsync(Server server, CancellationToken ct)
    {
        var users = await identity.GetUsersAsync(server.Members.Select(m => m.UserId).ToList(), ct);
        return server.Members.OrderByDescending(m => m.Role).ThenBy(m => m.CreatedAt)
            .Where(m => users.ContainsKey(m.UserId))
            .Select(m => { var u = users[m.UserId]; return new MemberProfileDto(server.Id, m.UserId, u.DisplayName, u.Username, u.AvatarUrl, u.Status, m.Role.ToString(), m.CreatedAt); })
            .ToList();
    }

    // ===== Thành viên =====

    public async Task<Result> AddMemberAsync(Guid actorId, Guid serverId, Guid userId, CancellationToken ct)
    {
        if (!await identity.IsActiveAsync(userId, ct)) return Result.Failure(UserNotFound);
        return await ChangeAsync(actorId, serverId, (g, a) => g.AddMember(a, userId),
            g => new MemberAddedToServer(g.Id, g.Name, userId, actorId), ct);
    }

    public Task<Result> RemoveMemberAsync(Guid actorId, Guid serverId, Guid userId, CancellationToken ct)
        => ChangeAsync(actorId, serverId, (g, a) => g.RemoveMember(a, userId),
            g => new MemberRemovedFromServer(g.Id, g.Name, userId, "Kicked", actorId), ct);

    public async Task<Result> BanAsync(Guid actorId, Guid serverId, Guid userId, string? reason, CancellationToken ct)
    {
        var server = await servers.GetAsync(serverId, ct);
        if (server is null) return Result.Failure(ServerNotFound);
        var wasMember = server.IsMember(userId);
        var r = server.Ban(await ActorAsync(actorId, ct), userId, reason);
        if (r.IsFailure) return r;
        await uow.SaveChangesAsync(ct);
        if (wasMember) await bus.PublishAsync(new MemberRemovedFromServer(serverId, server.Name, userId, "Banned", actorId), ct);
        return Result.Success();
    }

    public Task<Result> UnbanAsync(Guid actorId, Guid serverId, Guid userId, CancellationToken ct)
        => ChangeAsync(actorId, serverId, (g, a) => g.Unban(a, userId), null, ct);

    public async Task<Result<IReadOnlyList<ServerBanDto>>> ListBansAsync(Guid actorId, Guid serverId, CancellationToken ct)
    {
        var server = await servers.GetAsync(serverId, ct);
        if (server is null) return ServerNotFound;
        if (!server.CanManageMembers(await ActorAsync(actorId, ct))) return Error.Forbidden("Server.NoPermission", "Bạn không có quyền xem danh sách cấm.");
        return Result.Success<IReadOnlyList<ServerBanDto>>(server.Bans.Select(b => new ServerBanDto(b.UserId, b.Reason, b.BannedBy, b.CreatedAt)).ToList());
    }

    public Task<Result> SetRoleAsync(Guid actorId, Guid serverId, Guid userId, ServerRole role, CancellationToken ct)
        => ChangeAsync(actorId, serverId, (g, a) => g.SetRole(a, userId, role),
            g => new MemberRoleChanged(g.Id, g.Name, userId, role.ToString(), actorId), ct);

    public async Task<Result> AssignOwnerAsync(Guid actorId, Guid serverId, Guid newOwnerId, CancellationToken ct)
    {
        if (!await identity.IsActiveAsync(newOwnerId, ct)) return Result.Failure(UserNotFound);
        var server = await servers.GetAsync(serverId, ct);
        if (server is null) return Result.Failure(ServerNotFound);
        var oldOwnerId = server.OwnerId;
        var wasMember = server.IsMember(newOwnerId);

        var r = server.AssignOwner(await ActorAsync(actorId, ct), newOwnerId);
        if (r.IsFailure) return r;
        await uow.SaveChangesAsync(ct);

        if (!wasMember) await bus.PublishAsync(new MemberAddedToServer(serverId, server.Name, newOwnerId, actorId), ct);
        await bus.PublishAsync(new MemberRoleChanged(serverId, server.Name, newOwnerId, nameof(ServerRole.Owner), actorId), ct);
        await bus.PublishAsync(new MemberRoleChanged(serverId, server.Name, oldOwnerId, nameof(ServerRole.Moderator), actorId), ct);
        return Result.Success();
    }

    public Task<Result> LeaveAsync(Guid userId, Guid serverId, CancellationToken ct)
        => ChangeAsync(userId, serverId, (g, _) => g.Leave(userId),
            g => new MemberRemovedFromServer(g.Id, g.Name, userId, "Left", userId), ct);

    private async Task<Result> ChangeAsync(Guid actorId, Guid serverId, Func<Server, Actor, Result> action,
        Func<Server, IntegrationEvent>? eventToPublish, CancellationToken ct)
    {
        var server = await servers.GetAsync(serverId, ct);
        if (server is null) return Result.Failure(ServerNotFound);
        var r = action(server, await ActorAsync(actorId, ct));
        if (r.IsFailure) return r;
        await uow.SaveChangesAsync(ct);
        if (eventToPublish is not null) await bus.PublishAsync(eventToPublish(server), ct);
        return Result.Success();
    }
}
