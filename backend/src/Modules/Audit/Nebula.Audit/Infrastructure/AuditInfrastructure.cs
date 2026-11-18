using Microsoft.EntityFrameworkCore;
using Nebula.Audit.Application;
using Nebula.Audit.Domain;

namespace Nebula.Audit.Infrastructure;

public sealed class AuditDbContext(DbContextOptions<AuditDbContext> options) : DbContext(options), IAuditUnitOfWork
{
    public DbSet<AuditLog> Logs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<AuditLog>(e =>
        {
            e.ToTable("audit_logs");
            e.Property(x => x.Action).HasMaxLength(50).IsRequired();
            e.Property(x => x.TargetType).HasMaxLength(30).IsRequired();
            e.Property(x => x.TargetId).HasMaxLength(100).IsRequired();
            e.Property(x => x.Detail).HasColumnType("json").IsRequired();   // MySQL có kiểu JSON riêng
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => new { x.ActorId, x.CreatedAt });
            e.HasIndex(x => new { x.TargetId, x.CreatedAt });
        });
    }
}

internal sealed class EfAuditRepository(AuditDbContext db) : IAuditRepository
{
    public async Task AddAsync(AuditLog log, CancellationToken ct) => await db.Logs.AddAsync(log, ct);

    public async Task<IReadOnlyList<AuditLog>> SearchAsync(AuditQuery q, CancellationToken ct)
    {
        var query = db.Logs.AsNoTracking();
        if (q.ActorId is Guid actor) query = query.Where(l => l.ActorId == actor);
        if (!string.IsNullOrWhiteSpace(q.Action)) query = query.Where(l => l.Action == q.Action);
        if (!string.IsNullOrWhiteSpace(q.TargetId)) query = query.Where(l => l.TargetId == q.TargetId);
        if (q.From is DateTime from) query = query.Where(l => l.CreatedAt >= from);
        if (q.To is DateTime to) query = query.Where(l => l.CreatedAt <= to);
        return await query.OrderByDescending(l => l.CreatedAt).Skip(q.Skip).Take(q.Take).ToListAsync(ct);
    }
}
