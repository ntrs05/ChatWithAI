using Nebula.Shared.Contracts;
using Nebula.Shared.Kernel;

namespace Nebula.Identity.Application;

public sealed record LockUserRequest(string Reason);

/// <summary>Việc của admin hệ thống với tài khoản người dùng. Endpoint đã chặn bằng policy "Admin".</summary>
public sealed class AdminService(IUserRepository users, IIdentityUnitOfWork uow, IEventBus bus)
{
    private static readonly Error NotFound = Error.NotFound("User.NotFound", "Không tìm thấy người dùng.");

    public async Task<IReadOnlyList<UserDto>> ListAsync(string? keyword, bool? locked, CancellationToken ct)
        => (await users.ListAsync(keyword, locked, ct)).Select(UserDto.From).ToList();

    public async Task<Result> LockAsync(Guid actorId, Guid userId, string reason, CancellationToken ct)
    {
        var user = await users.GetByIdAsync(userId, ct);
        if (user is null) return Result.Failure(NotFound);
        var r = user.Lock(actorId, reason);
        if (r.IsFailure) return r;
        await uow.SaveChangesAsync(ct);
        // Messaging ngắt kết nối realtime, Audit ghi nhật ký.
        await bus.PublishAsync(new UserLocked(userId, actorId, reason), ct);
        return Result.Success();
    }

    public async Task<Result> UnlockAsync(Guid actorId, Guid userId, CancellationToken ct)
    {
        var user = await users.GetByIdAsync(userId, ct);
        if (user is null) return Result.Failure(NotFound);
        user.Unlock();
        await uow.SaveChangesAsync(ct);
        await bus.PublishAsync(new UserUnlocked(userId, actorId), ct);
        return Result.Success();
    }

}
