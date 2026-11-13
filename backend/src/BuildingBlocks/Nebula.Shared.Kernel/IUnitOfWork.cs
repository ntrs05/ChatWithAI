namespace Nebula.Shared.Kernel;

/// <summary>Mỗi module có một DbContext implement interface này để Application lưu thay đổi mà không biết EF Core.</summary>
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
