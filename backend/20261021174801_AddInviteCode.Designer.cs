using Nebula.Shared.Kernel;

namespace Nebula.Organization.Domain;

/// <summary>Invite = chủ server/quản trị viên mời người khác. Request = người dùng tự xin vào server.</summary>
public enum JoinRequestType { Invite, Request }
public enum JoinRequestStatus { Pending, Accepted, Rejected, Cancelled }

/// <summary>Lời mời vào server hoặc yêu cầu xin vào server, chờ bên kia trả lời.</summary>
public sealed class JoinRequest : Entity
{
    private JoinRequest() { }
    public Guid ServerId { get; private set; }
    /// <summary>Người sẽ vào server (người được mời / người xin vào).</summary>
    public Guid UserId { get; private set; }
    public JoinRequestType Type { get; private set; }
    public JoinRequestStatus Status { get; private set; } = JoinRequestStatus.Pending;
    public Guid CreatedBy { get; private set; }
    public Guid? RespondedBy { get; private set; }
    public DateTime? RespondedAt { get; private set; }

    public static Result<JoinRequest> CreateRequest(Server server, Guid userId)
    {
        if (server.JoinPolicy != JoinPolicy.RequestToJoin) return Error.Forbidden("JoinRequest.InviteOnly", "Server này chỉ vào được khi được mời.");
        var check = CheckCanJoin(server, userId);
        return check.IsFailure ? check.Error : Result.Success(new JoinRequest { ServerId = server.Id, UserId = userId, Type = JoinRequestType.Request, CreatedBy = userId });
    }

    public static Result<JoinRequest> CreateInvite(Server server, Actor inviter, Guid userId)
    {
        // Mọi thành viên đều mời được người quen (như Discord); người được mời vẫn phải tự bấm đồng ý nên không bị ép vào server.
        if (!server.IsMember(inviter.UserId) && !server.CanManageMembers(inviter)) return Error.Forbidden("JoinRequest.NoPermission", "Chỉ thành viên của server mới mời được người khác.");
        var check = CheckCanJoin(server, userId);
        return check.IsFailure ? check.Error : Result.Success(new JoinRequest { ServerId = server.Id, UserId = userId, Type = JoinRequestType.Invite, CreatedBy = inviter.UserId });
    }

    private static Result CheckCanJoin(Server server, Guid userId)
    {
        if (server.IsMember(userId)) return Result.Failure(Error.Conflict("JoinRequest.AlreadyMember", "Người này đã ở trong server."));
        if (server.IsBanned(userId)) return Result.Failure(Error.Forbidden("JoinRequest.Banned", "Người này đang bị cấm khỏi server."));
        return Result.Success();
    }

    /// <summary>Ai được trả lời: yêu cầu xin vào → chủ server/quản trị viên/admin hệ thống duyệt; lời mời → chính người được mời.</summary>
    public Result Respond(Server server, Actor actor, bool accept)
    {
        if (Status != JoinRequestStatus.Pending) return Result.Failure(Error.Conflict("JoinRequest.Closed", "Yêu cầu này đã được xử lý."));
        var allowed = Type == JoinRequestType.Request ? server.CanManageMembers(actor) : actor.UserId == UserId;
        if (!allowed) return Result.Failure(Error.Forbidden("JoinRequest.NoPermission", "Bạn không có quyền trả lời yêu cầu này."));

        if (accept)
        {
            var added = server.AddMemberInternal(UserId, Type == JoinRequestType.Request ? actor.UserId : CreatedBy);
            if (added.IsFailure) return added;
        }
        Status = accept ? JoinRequestStatus.Accepted : JoinRequestStatus.Rejected;
        RespondedBy = actor.UserId;
        RespondedAt = DateTime.UtcNow;
        return Result.Success();
    }

    /// <summary>Người tạo rút lại yêu cầu / lời mời.</summary>
    public Result Cancel(Guid actorId)
    {
        if (Status != JoinRequestStatus.Pending) return Result.Failure(Error.Conflict("JoinRequest.Closed", "Yêu cầu này đã được xử lý."));
        if (actorId != CreatedBy) return Result.Failure(Error.Forbidden("JoinRequest.NoPermission", "Chỉ người tạo mới hủy được."));
        Status = JoinRequestStatus.Cancelled;
        RespondedBy = actorId;
        RespondedAt = DateTime.UtcNow;
        return Result.Success();
    }
}

/// <summary>Cài đặt hệ thống do admin hệ thống chỉnh, lưu dạng khóa-giá trị.</summary>
public sealed class SystemSetting
{
    public const string AllowUserCreateServers = "AllowUserCreateServers";
    public static readonly IReadOnlyDictionary<string, string> Defaults = new Dictionary<string, string>
    {
        [AllowUserCreateServers] = "true"
    };

    private SystemSetting() { }
    public string Key { get; private set; } = "";
    public string Value { get; private set; } = "";
    public Guid UpdatedBy { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    public static SystemSetting Create(string key, string value, Guid updatedBy)
        => new() { Key = key, Value = value, UpdatedBy = updatedBy, UpdatedAt = DateTime.UtcNow };

    public void Update(string value, Guid updatedBy) { Value = value; UpdatedBy = updatedBy; UpdatedAt = DateTime.UtcNow; }
}
