using Nebula.Organization.Domain;
using Nebula.Shared.Contracts;
using Nebula.Shared.Kernel;

namespace Nebula.Organization.Application;

public sealed class JoinRequestService(
    IServerRepository servers, IJoinRequestRepository requests, IIdentityApi identity, IOrganizationUnitOfWork uow, IEventBus bus)
{
    private static readonly Error ServerNotFound = Error.NotFound("Server.NotFound", "Không tìm thấy server.");
    private static readonly Error RequestNotFound = Error.NotFound("JoinRequest.NotFound", "Không tìm thấy yêu cầu.");

    private async Task<Actor> ActorAsync(Guid userId, CancellationToken ct)
        => new(userId, (await identity.GetUserAsync(userId, ct))?.IsAdmin ?? false);

    public async Task<Result<JoinRequestDto>> RequestToJoinAsync(Guid userId, Guid serverId, CancellationToken ct)
    {
        var server = await servers.GetAsync(serverId, ct);
        if (server is null) return ServerNotFound;
        if (await requests.FindPendingAsync(serverId, userId, ct) is not null) return Error.Conflict("JoinRequest.Pending", "Đã có yêu cầu đang chờ.");

        var created = JoinRequest.CreateRequest(server, userId);
        if (created.IsFailure) return created.Error;
        await requests.AddAsync(created.Value, ct);
        await uow.SaveChangesAsync(ct);

        // Báo cho chủ server/quản trị viên để duyệt.
        var reviewers = server.Members.Where(m => m.Role != ServerRole.Member).Select(m => m.UserId).ToList();
        await bus.PublishAsync(new JoinRequestCreated(created.Value.Id, serverId, server.Name, userId, "Request", reviewers, userId), ct);
        return Result.Success(JoinRequestDto.From(created.Value));
    }

    public async Task<Result<JoinRequestDto>> InviteAsync(Guid actorId, Guid serverId, Guid userId, CancellationToken ct)
    {
        if (!await identity.IsActiveAsync(userId, ct)) return Error.NotFound("User.NotFound", "Người dùng không tồn tại hoặc đã bị khóa.");
        var server = await servers.GetAsync(serverId, ct);
        if (server is null) return ServerNotFound;
        if (await requests.FindPendingAsync(serverId, userId, ct) is not null) return Error.Conflict("JoinRequest.Pending", "Đã có lời mời/yêu cầu đang chờ.");

        var created = JoinRequest.CreateInvite(server, await ActorAsync(actorId, ct), userId);
        if (created.IsFailure) return created.Error;
        await requests.AddAsync(created.Value, ct);
        await uow.SaveChangesAsync(ct);
        await bus.PublishAsync(new JoinRequestCreated(created.Value.Id, serverId, server.Name, userId, "Invite", [userId], actorId), ct);
        return Result.Success(JoinRequestDto.From(created.Value));
    }

    public async Task<Result<IReadOnlyList<JoinRequestDto>>> ListForServerAsync(Guid actorId, Guid serverId, CancellationToken ct)
    {
        var server = await servers.GetAsync(serverId, ct);
        if (server is null) return ServerNotFound;
        if (!server.CanManageMembers(await ActorAsync(actorId, ct))) return Error.Forbidden("JoinRequest.NoPermission", "Bạn không có quyền xem danh sách này.");
        return Result.Success<IReadOnlyList<JoinRequestDto>>((await requests.ListPendingForServerAsync(serverId, ct)).Select(JoinRequestDto.From).ToList());
    }

    public async Task<IReadOnlyList<JoinRequestDto>> ListMineAsync(Guid userId, CancellationToken ct)
        => (await requests.ListPendingForUserAsync(userId, ct)).Select(JoinRequestDto.From).ToList();

    public async Task<IReadOnlyList<InvitationDto>> ListInvitationsAsync(Guid userId, CancellationToken ct)
    {
        var invites = (await requests.ListPendingForUserAsync(userId, ct)).Where(r => r.Type == JoinRequestType.Invite).ToList();
        if (invites.Count == 0) return [];
        var inviters = await identity.GetUsersAsync(invites.Select(r => r.CreatedBy).ToList(), ct);
        var result = new List<InvitationDto>();
        foreach (var r in invites)
        {
            var server = await servers.GetAsync(r.ServerId, ct);
            if (server is null || server.IsMember(userId)) continue;
            var u = inviters.GetValueOrDefault(r.CreatedBy);
            result.Add(new InvitationDto(r.Id, server.Id, server.Name, server.AvatarUrl, server.Members.Count,
                new InviterDto(r.CreatedBy, u?.DisplayName ?? "Một thành viên", u?.Username ?? "", u?.AvatarUrl), r.CreatedAt));
        }
        return result;
    }

    public async Task<Result> RespondAsync(Guid actorId, Guid requestId, bool accept, CancellationToken ct)
    {
        var request = await requests.GetAsync(requestId, ct);
        if (request is null) return Result.Failure(RequestNotFound);
        var server = await servers.GetAsync(request.ServerId, ct);
        if (server is null) return Result.Failure(ServerNotFound);

        var r = request.Respond(server, await ActorAsync(actorId, ct), accept);
        if (r.IsFailure) return r;
        await uow.SaveChangesAsync(ct);
        if (accept) await bus.PublishAsync(new MemberAddedToServer(server.Id, server.Name, request.UserId, actorId), ct);
        return Result.Success();
    }

    public async Task<Result> CancelAsync(Guid actorId, Guid requestId, CancellationToken ct)
    {
        var request = await requests.GetAsync(requestId, ct);
        if (request is null) return Result.Failure(RequestNotFound);
        var r = request.Cancel(actorId);
        if (r.IsFailure) return r;
        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}
