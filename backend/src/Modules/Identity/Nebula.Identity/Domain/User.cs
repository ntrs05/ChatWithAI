using Nebula.Shared.Kernel;

namespace Nebula.Identity.Domain;

public enum UserStatus
{
    // TODO: giá trị lấy theo ERD
}

public enum SystemRole
{
    // TODO: giá trị lấy theo ERD
}

// TODO: NewUserCode, AssignUserCode, RegisterWithPassword, SetPasswordHash, Register
//       UpdateProfile, SetStatus, PromoteToAdmin, Lock, Unlock
public sealed class User : Entity
{
}

// TODO: CreateDefault, SetTypingIndicator
public sealed class UserSettings
{
}
