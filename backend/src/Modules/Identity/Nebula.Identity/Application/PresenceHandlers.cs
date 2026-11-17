using Nebula.Identity.Domain;
using Nebula.Shared.Contracts;
using Nebula.Shared.Kernel;

namespace Nebula.Identity.Application;

public sealed class UserConnectedHandler(IUserRepository users, IIdentityUnitOfWork uow, IEventBus bus) : IEventHandler<UserConnected>
{
    public async Task HandleAsync(UserConnected e, CancellationToken ct)
    {
        var user = await users.GetByIdAsync(e.UserId, ct);
        if (user is null || user.Status == UserStatus.DoNotDisturb) return;
        if (user.SetStatus(UserStatus.Online).IsFailure) return;
        await uow.SaveChangesAsync(ct);
        await bus.PublishAsync(new UserStatusChanged(e.UserId, nameof(UserStatus.Online)), ct);
    }
}

public sealed class UserDisconnectedHandler(IUserRepository users, IIdentityUnitOfWork uow, IEventBus bus) : IEventHandler<UserDisconnected>
{
    public async Task HandleAsync(UserDisconnected e, CancellationToken ct)
    {
        var user = await users.GetByIdAsync(e.UserId, ct);
        if (user is null || user.Status == UserStatus.DoNotDisturb) return;
        // bị ban thì SetStatus từ chối, bỏ qua
        if (user.SetStatus(UserStatus.Offline).IsFailure) return;
        await uow.SaveChangesAsync(ct);
        await bus.PublishAsync(new UserStatusChanged(e.UserId, nameof(UserStatus.Offline)), ct);
    }
}
