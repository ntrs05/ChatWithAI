using Nebula.Shared.Kernel;

namespace Nebula.Audit.Domain;

/// <summary>Một dòng nhật ký "ai làm gì, với ai/cái gì, lúc nào" để admin hệ thống kiểm soát hoạt động trong app.
/// Chỉ thêm, không bao giờ sửa hay xóa.</summary>
public sealed class AuditLog : Entity
{
    private AuditLog() { }
    public Guid ActorId { get; private set; }
    public string Action { get; private set; } = "";
    /// <summary>"User", "Server", "Setting"...</summary>
    public string TargetType { get; private set; } = "";
    public string TargetId { get; private set; } = "";
    /// <summary>Chi tiết dạng JSON (toàn bộ event).</summary>
    public string Detail { get; private set; } = "";

    public static AuditLog Create(Guid actorId, string action, string targetType, string targetId, string detail)
        => new() { ActorId = actorId, Action = action, TargetType = targetType, TargetId = targetId, Detail = detail };
}
