using Nebula.Shared.Kernel;

namespace Nebula.Organization.Domain;

public enum JoinPolicy
{
    // TODO: giá trị lấy theo ERD
}

public enum ServerRole
{
    // TODO: giá trị lấy theo ERD
}

// TODO: các trường (Guid UserId, bool IsAdmin)
public sealed record Actor
{
}

// TODO: Create, JoinOpen, JoinWithCode, RoleOf, IsMember, IsBanned, CanRead, CanModerate
//       CanManage, CanManageMembers, Update, EnsureCanDelete, AddMember, AddMemberInternal
//       RemoveMember, Ban, Unban, SetRole, AssignOwner, Leave
public sealed class Server : Entity
{
}

// TODO: Create, SetRole
public sealed class ServerMember : Entity
{
}

// TODO: Create
public sealed class ServerBan : Entity
{
}
