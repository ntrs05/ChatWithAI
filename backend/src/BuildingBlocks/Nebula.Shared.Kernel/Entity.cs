namespace Nebula.Shared.Kernel;

/// <summary>Lớp cha của mọi entity: Id kiểu Guid v7 (sinh ở phía code, tăng dần theo thời gian nên chỉ mục MySQL không bị phân mảnh) và thời điểm tạo.</summary>
public abstract class Entity
{
    public Guid Id { get; protected set; } = Guid.CreateVersion7();
    public DateTime CreatedAt { get; protected set; } = DateTime.UtcNow;
}
