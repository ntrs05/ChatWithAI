using Nebula.Identity.Domain;

namespace Nebula.Identity.Application;

public interface IIdentityUnitOfWork : Nebula.Shared.Kernel.IUnitOfWork { }

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<User>> GetByIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct);
    Task<User?> GetByEmailAsync(string email, CancellationToken ct);
    Task<User?> FindByTagAsync(string displayName, string userCode, CancellationToken ct);
    Task<bool> TagTakenAsync(string displayName, string userCode, Guid? exceptUserId, CancellationToken ct);
    Task<IReadOnlyList<User>> ListAsync(string? keyword, bool? locked, CancellationToken ct);
    Task<IReadOnlyList<User>> SearchAsync(string keyword, int take, CancellationToken ct);
    Task AddAsync(User user, CancellationToken ct);
}

public sealed record GoogleIdentity(string Subject, string Email, string Name, string? Picture);

public interface IGoogleTokenValidator
{
    Task<GoogleIdentity?> ValidateAsync(string idToken, CancellationToken ct);
}

public interface ITokenService
{
    string CreateAccessToken(User user);
}

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string hash);
}

public interface IAdminPolicy
{
    bool IsAdminEmail(string email);
}
