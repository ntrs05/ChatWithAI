namespace Nebula.Identity.Application;

public interface IIdentityUnitOfWork
{
}

public interface IUserRepository
{
}

// TODO: các trường (string Subject, string Email, string Name, string? Picture)
public sealed record GoogleIdentity
{
}

public interface IGoogleTokenValidator
{
}

public interface ITokenService
{
}

public interface IPasswordHasher
{
}

public interface IAdminPolicy
{
}
