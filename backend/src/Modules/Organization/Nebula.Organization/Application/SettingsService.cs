using Nebula.Organization.Domain;
using Nebula.Shared.Contracts;
using Nebula.Shared.Kernel;

namespace Nebula.Organization.Application;

public sealed class SettingsService(ISettingRepository repo, IOrganizationUnitOfWork uow, IEventBus bus)
{
    public async Task<IReadOnlyList<SettingDto>> ListAsync(CancellationToken ct)
    {
        var saved = (await repo.ListAsync(ct)).ToDictionary(s => s.Key, s => s.Value);
        return SystemSetting.Defaults.Select(d => new SettingDto(d.Key, saved.GetValueOrDefault(d.Key, d.Value))).ToList();
    }

    public async Task<bool> IsEnabledAsync(string key, CancellationToken ct)
        => ((await repo.GetAsync(key, ct))?.Value ?? SystemSetting.Defaults.GetValueOrDefault(key, "false")) == "true";

    public async Task<Result> SetAsync(Guid actorId, string key, string value, CancellationToken ct)
    {
        if (!SystemSetting.Defaults.ContainsKey(key)) return Result.Failure(Error.NotFound("Setting.Unknown", $"Không có cài đặt '{key}'."));
        var setting = await repo.GetAsync(key, ct);
        if (setting is null) await repo.AddAsync(SystemSetting.Create(key, value, actorId), ct);
        else setting.Update(value, actorId);
        await uow.SaveChangesAsync(ct);
        await bus.PublishAsync(new SystemSettingChanged(key, value, actorId), ct);
        return Result.Success();
    }
}
