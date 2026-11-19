using Nebula.Shared.Kernel;

namespace Nebula.Audit.Domain;

public sealed class AuditLog : Entity
{
    private AuditLog() { }
    public Guid ActorId { get; private set; }
    public string Action { get; private set; } = "";
    public string TargetType { get; private set; } = "";
    public string TargetId { get; private set; } = "";
    public string Detail { get; private set; } = "";

    public static AuditLog Create(Guid actorId, string action, string targetType, string targetId, string detail)
        => new() { ActorId = actorId, Action = action, TargetType = targetType, TargetId = targetId, Detail = detail };
}
