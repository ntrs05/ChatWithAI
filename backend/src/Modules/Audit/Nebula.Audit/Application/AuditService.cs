namespace Nebula.Audit.Application;

public interface IAuditUnitOfWork
{
}

// TODO: các trường (Guid? ActorId, string? Action, string? TargetId, DateTime? From, DateTime? To, int Skip, int Take)
public sealed record AuditQuery
{
}

public interface IAuditRepository
{
}

// TODO: các trường (Guid Id, Guid ActorId, string Action, string TargetType, string TargetId, string Detail, DateTime CreatedAt)
//       From
public sealed record AuditLogDto
{
}

// TODO: SearchAsync
public sealed class AuditService
{
}

// TODO: HandleAsync
public sealed class AuditEventHandler
{
}
