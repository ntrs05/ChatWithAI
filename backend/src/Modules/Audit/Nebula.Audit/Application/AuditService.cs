using System.Text.Encodings.Web;
using System.Text.Json;
using Nebula.Audit.Domain;
using Nebula.Shared.Contracts;
using Nebula.Shared.Kernel;

namespace Nebula.Audit.Application;

public interface IAuditUnitOfWork : IUnitOfWork { }

public sealed record AuditQuery(Guid? ActorId, string? Action, string? TargetId, DateTime? From, DateTime? To, int Skip, int Take);

public interface IAuditRepository
{
    Task AddAsync(AuditLog log, CancellationToken ct);
    Task<IReadOnlyList<AuditLog>> SearchAsync(AuditQuery query, CancellationToken ct);
}

public sealed record AuditLogDto(Guid Id, Guid ActorId, string Action, string TargetType, string TargetId, string Detail, DateTime CreatedAt)
{
    public static AuditLogDto From(AuditLog l) => new(l.Id, l.ActorId, l.Action, l.TargetType, l.TargetId, l.Detail, l.CreatedAt);
}

public sealed class AuditService(IAuditRepository repo)
{
    public async Task<IReadOnlyList<AuditLogDto>> SearchAsync(AuditQuery q, CancellationToken ct)
        => (await repo.SearchAsync(q with { Skip = Math.Max(0, q.Skip), Take = Math.Clamp(q.Take, 1, 200) }, ct)).Select(AuditLogDto.From).ToList();
}

public sealed class AuditEventHandler(IAuditRepository repo, IAuditUnitOfWork uow) :
    IEventHandler<UserRegistered>, IEventHandler<UserLocked>, IEventHandler<UserUnlocked>,
    IEventHandler<ServerCreated>, IEventHandler<ServerDeleted>,
    IEventHandler<MemberAddedToServer>, IEventHandler<MemberRemovedFromServer>, IEventHandler<MemberRoleChanged>,
    IEventHandler<SystemSettingChanged>, IEventHandler<StorageQuotaChanged>
{
    // giữ nguyên tiếng Việt trong json
    private static readonly JsonSerializerOptions Json = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    private async Task LogAsync(Guid actorId, string action, string targetType, object targetId, object evt, CancellationToken ct)
    {
        await repo.AddAsync(AuditLog.Create(actorId, action, targetType, targetId.ToString()!, JsonSerializer.Serialize(evt, evt.GetType(), Json)), ct);
        await uow.SaveChangesAsync(ct);
    }

    public Task HandleAsync(UserRegistered e, CancellationToken ct) => LogAsync(e.UserId, "UserRegistered", "User", e.UserId, e, ct);
    public Task HandleAsync(UserLocked e, CancellationToken ct) => LogAsync(e.ActorId, "UserLocked", "User", e.UserId, e, ct);
    public Task HandleAsync(UserUnlocked e, CancellationToken ct) => LogAsync(e.ActorId, "UserUnlocked", "User", e.UserId, e, ct);
    public Task HandleAsync(ServerCreated e, CancellationToken ct) => LogAsync(e.ActorId, "ServerCreated", "Server", e.ServerId, e, ct);
    public Task HandleAsync(ServerDeleted e, CancellationToken ct) => LogAsync(e.ActorId, "ServerDeleted", "Server", e.ServerId, e, ct);
    public Task HandleAsync(MemberAddedToServer e, CancellationToken ct) => LogAsync(e.ActorId, "MemberAdded", "Server", e.ServerId, e, ct);
    public Task HandleAsync(MemberRemovedFromServer e, CancellationToken ct) => LogAsync(e.ActorId, $"Member{e.Reason}", "Server", e.ServerId, e, ct);
    public Task HandleAsync(MemberRoleChanged e, CancellationToken ct) => LogAsync(e.ActorId, "MemberRoleChanged", "Server", e.ServerId, e, ct);
    public Task HandleAsync(SystemSettingChanged e, CancellationToken ct) => LogAsync(e.ActorId, "SettingChanged", "Setting", e.Key, e, ct);
    public Task HandleAsync(StorageQuotaChanged e, CancellationToken ct) => LogAsync(e.ActorId, "QuotaChanged", "User", e.UserId, e, ct);
}
