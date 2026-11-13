using Nebula.Shared.Kernel;

namespace Nebula.Organization.Domain;

public enum JoinPolicy { InviteOnly, RequestToJoin, Open }

public enum ServerRole { Member, Moderator, Owner }

public sealed record Actor(Guid UserId, bool IsAdmin);

public sealed class Server : Entity
{
    private Server() { }
    private readonly List<ServerMember> _members = [];
    private readonly List<ServerBan> _bans = [];

    public string Name { get; private set; } = "";
    public string? Description { get; private set; }
    public string? AvatarUrl { get; private set; }
    public string InviteCode { get; private set; } = NewInviteCode();
    public JoinPolicy JoinPolicy { get; private set; }
    public Guid CreatedBy { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public IReadOnlyCollection<ServerMember> Members => _members;
    public IReadOnlyCollection<ServerBan> Bans => _bans;

    // ===== Tạo server =====

    public static Result<Server> Create(Actor actor, string name, string? description, JoinPolicy policy)
    {
        var g = new Server { CreatedBy = actor.UserId, JoinPolicy = policy };
        var r = g.SetInfo(name, description, null);
        if (r.IsFailure) return r.Error;
        g._members.Add(ServerMember.Create(g.Id, actor.UserId, ServerRole.Owner, actor.UserId));
        return Result.Success(g);
    }

    private const string CodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // bỏ ký tự dễ nhầm: I O 0 1
    private static string NewInviteCode()
        => string.Create(8, 0, (span, _) => { for (var i = 0; i < span.Length; i++) span[i] = CodeAlphabet[System.Security.Cryptography.RandomNumberGenerator.GetInt32(CodeAlphabet.Length)]; });

    public Result JoinOpen(Guid userId)
        => JoinPolicy != JoinPolicy.Open
            ? Forbidden("Server này không công khai. Hãy dùng mã mời hoặc gửi yêu cầu tham gia.")
            : AddMemberInternal(userId, userId);

    public Result JoinWithCode(Guid userId, string code)
        => string.Equals(InviteCode, code?.Trim(), StringComparison.OrdinalIgnoreCase)
            ? AddMemberInternal(userId, userId)
            : Result.Failure(Error.NotFound("Server.InvalidCode", "Mã mời không đúng."));

    // ===== Tra cứu quyền =====

    public ServerRole? RoleOf(Guid userId) => _members.FirstOrDefault(m => m.UserId == userId)?.Role;
    public bool IsMember(Guid userId) => _members.Any(m => m.UserId == userId);
    public bool IsBanned(Guid userId) => _bans.Any(b => b.UserId == userId);
    public Guid OwnerId => _members.Single(m => m.Role == ServerRole.Owner).UserId;

    public bool CanRead(Actor a) => IsMember(a.UserId);
    public bool CanModerate(Actor a) => RoleOf(a.UserId) is ServerRole.Owner or ServerRole.Moderator;
    public bool CanManage(Actor a) => RoleOf(a.UserId) == ServerRole.Owner;
    public bool CanManageMembers(Actor a) => RoleOf(a.UserId) is ServerRole.Owner or ServerRole.Moderator;

    private static Result Forbidden(string message) => Result.Failure(Error.Forbidden("Server.NoPermission", message));

    // ===== Thông tin server =====

    public Result Update(Actor actor, string name, string? description, string? avatarUrl, JoinPolicy policy)
    {
        if (!CanManage(actor)) return Forbidden("Chỉ chủ server mới sửa được thông tin server.");
        var r = SetInfo(name, description, avatarUrl);
        if (r.IsFailure) return r;
        JoinPolicy = policy;
        return Result.Success();
    }

    private Result SetInfo(string name, string? description, string? avatarUrl)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Length > 100) return Result.Failure(new Error("Server.InvalidName", "Tên server phải từ 1 đến 100 ký tự."));
        if (description?.Length > 500) return Result.Failure(new Error("Server.InvalidDescription", "Mô tả tối đa 500 ký tự."));
        Name = name.Trim();
        Description = description?.Trim();
        AvatarUrl = avatarUrl;
        UpdatedAt = DateTime.UtcNow;
        return Result.Success();
    }

    public Result EnsureCanDelete(Actor actor)
        => actor.IsAdmin || RoleOf(actor.UserId) == ServerRole.Owner
            ? Result.Success()
            : Forbidden("Bạn không có quyền xóa server này.");

    // ===== Thành viên =====

    public Result AddMember(Actor actor, Guid userId)
    {
        if (!CanManageMembers(actor)) return Forbidden("Chỉ chủ server hoặc quản trị viên mới thêm được thành viên.");
        return AddMemberInternal(userId, actor.UserId);
    }

    internal Result AddMemberInternal(Guid userId, Guid addedBy)
    {
        if (IsBanned(userId)) return Result.Failure(Error.Forbidden("Server.UserBanned", "Người này đang bị cấm khỏi server, cần gỡ cấm trước."));
        if (IsMember(userId)) return Result.Failure(Error.Conflict("Server.AlreadyMember", "Người này đã ở trong server."));
        _members.Add(ServerMember.Create(Id, userId, ServerRole.Member, addedBy));
        return Result.Success();
    }

    private Result CheckCanRemove(Actor actor, Guid userId)
    {
        var target = RoleOf(userId);
        if (target is null) return Result.Failure(Error.NotFound("Server.NotMember", "Người này không ở trong server."));
        if (target == ServerRole.Owner) return Forbidden("Không thể xóa chủ server. Hãy giao quyền chủ server cho người khác trước.");
        if (RoleOf(actor.UserId) == ServerRole.Owner) return Result.Success();
        if (RoleOf(actor.UserId) == ServerRole.Moderator && target == ServerRole.Member) return Result.Success();
        return Forbidden("Bạn không có quyền xóa người này khỏi server.");
    }

    public Result RemoveMember(Actor actor, Guid userId)
    {
        var r = CheckCanRemove(actor, userId);
        if (r.IsFailure) return r;
        _members.RemoveAll(m => m.UserId == userId);
        return Result.Success();
    }

    public Result Ban(Actor actor, Guid userId, string? reason)
    {
        if (IsBanned(userId)) return Result.Failure(Error.Conflict("Server.AlreadyBanned", "Người này đã bị cấm."));
        if (IsMember(userId))
        {
            var r = CheckCanRemove(actor, userId);
            if (r.IsFailure) return r;
            _members.RemoveAll(m => m.UserId == userId);
        }
        else if (!CanManageMembers(actor)) return Forbidden("Bạn không có quyền cấm người khác.");
        _bans.Add(ServerBan.Create(Id, userId, actor.UserId, reason));
        return Result.Success();
    }

    public Result Unban(Actor actor, Guid userId)
    {
        if (!CanManageMembers(actor)) return Forbidden("Bạn không có quyền gỡ cấm.");
        var ban = _bans.FirstOrDefault(b => b.UserId == userId);
        if (ban is null) return Result.Failure(Error.NotFound("Server.NotBanned", "Người này không bị cấm."));
        _bans.Remove(ban);
        return Result.Success();
    }

    public Result SetRole(Actor actor, Guid userId, ServerRole role)
    {
        if (RoleOf(actor.UserId) != ServerRole.Owner) return Forbidden("Chỉ chủ server mới phân quyền được.");
        if (role == ServerRole.Owner) return Result.Failure(new Error("Server.UseAssignOwner", "Dùng chức năng giao quyền chủ server."));
        var member = _members.FirstOrDefault(m => m.UserId == userId);
        if (member is null) return Result.Failure(Error.NotFound("Server.NotMember", "Người này không ở trong server."));
        if (member.Role == ServerRole.Owner) return Forbidden("Không thể hạ quyền chủ server. Hãy giao quyền chủ server cho người khác.");
        member.SetRole(role);
        return Result.Success();
    }

    public Result AssignOwner(Actor actor, Guid newOwnerId)
    {
        if (RoleOf(actor.UserId) != ServerRole.Owner) return Forbidden("Chỉ chủ server mới chuyển quyền sở hữu được.");
        if (newOwnerId == OwnerId) return Result.Failure(Error.Conflict("Server.AlreadyOwner", "Người này đã là chủ server."));

        var newOwner = _members.FirstOrDefault(m => m.UserId == newOwnerId);
        if (newOwner is null) return Result.Failure(Error.NotFound("Server.NotMember", "Người này không ở trong server."));
        _members.Single(m => m.Role == ServerRole.Owner).SetRole(ServerRole.Moderator);
        newOwner.SetRole(ServerRole.Owner);
        return Result.Success();
    }

    public Result Leave(Guid userId)
    {
        var role = RoleOf(userId);
        if (role is null) return Result.Failure(Error.NotFound("Server.NotMember", "Bạn không ở trong server này."));
        if (role == ServerRole.Owner) return Forbidden("Chủ server không thể rời server. Hãy giao quyền chủ server trước.");
        _members.RemoveAll(m => m.UserId == userId);
        return Result.Success();
    }
}

public sealed class ServerMember : Entity
{
    private ServerMember() { }
    public Guid ServerId { get; private set; }
    public Guid UserId { get; private set; }
    public ServerRole Role { get; private set; }
    public Guid AddedBy { get; private set; }

    internal static ServerMember Create(Guid serverId, Guid userId, ServerRole role, Guid addedBy)
        => new() { ServerId = serverId, UserId = userId, Role = role, AddedBy = addedBy };
    internal void SetRole(ServerRole role) => Role = role;
}

public sealed class ServerBan : Entity
{
    private ServerBan() { }
    public Guid ServerId { get; private set; }
    public Guid UserId { get; private set; }
    public string? Reason { get; private set; }
    public Guid BannedBy { get; private set; }

    internal static ServerBan Create(Guid serverId, Guid userId, Guid bannedBy, string? reason)
        => new() { ServerId = serverId, UserId = userId, BannedBy = bannedBy, Reason = reason?.Trim() };
}
