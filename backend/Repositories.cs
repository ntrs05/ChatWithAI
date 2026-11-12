using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Nebula.Organization.Application;
using Nebula.Organization.Domain;
using Nebula.Shared.Infrastructure;

namespace Nebula.Organization.Api;

public sealed record UserIdRequest(Guid UserId);
public sealed record ServerBanRequest(Guid UserId, string? Reason);
public sealed record ServerRoleRequest(ServerRole Role);
public sealed record RespondRequest(bool Accept);
public sealed record SettingRequest(string Value);
public sealed record JoinCodeRequest(string Code);

internal sealed class OrganizationEndpoints : IModuleEndpoints
{
    public void Map(IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/servers").RequireAuthorization();

        // ---- Server ----
        g.MapPost("", async (CreateServerRequest r, HttpContext c, ServerService s, CancellationToken ct)
            => (await s.CreateAsync(c.User.GetUserId(), r, ct)).ToHttp());
        g.MapGet("", async (HttpContext c, ServerService s, CancellationToken ct)
            => Results.Ok(await s.ListMineAsync(c.User.GetUserId(), ct)));
        g.MapGet("joinable", async (string? q, HttpContext c, ServerService s, CancellationToken ct)
            => Results.Ok(await s.ListJoinableAsync(c.User.GetUserId(), q, ct)));
        g.MapPost("join-by-code", async (JoinCodeRequest r, HttpContext c, ServerService s, CancellationToken ct)
            => (await s.JoinByCodeAsync(c.User.GetUserId(), r.Code, ct)).ToHttp());
        g.MapPost("{id:guid}/join", async (Guid id, HttpContext c, ServerService s, CancellationToken ct)
            => (await s.JoinOpenAsync(c.User.GetUserId(), id, ct)).ToHttp());
        g.MapGet("{id:guid}/members", async (Guid id, HttpContext c, ServerService s, CancellationToken ct)
            => (await s.ListMembersAsync(c.User.GetUserId(), id, ct)).ToHttp());
        g.MapGet("{id:guid}", async (Guid id, HttpContext c, ServerService s, CancellationToken ct)
            => (await s.DetailAsync(c.User.GetUserId(), id, ct)).ToHttp());
        g.MapPut("{id:guid}", async (Guid id, UpdateServerRequest r, HttpContext c, ServerService s, CancellationToken ct)
            => (await s.UpdateAsync(c.User.GetUserId(), id, r, ct)).ToHttp());
        g.MapDelete("{id:guid}", async (Guid id, HttpContext c, ServerService s, CancellationToken ct)
            => (await s.DeleteAsync(c.User.GetUserId(), id, ct)).ToHttp());
        g.MapPost("{id:guid}/leave", async (Guid id, HttpContext c, ServerService s, CancellationToken ct)
            => (await s.LeaveAsync(c.User.GetUserId(), id, ct)).ToHttp());

        // ---- Thành viên, phân quyền, cấm ----
        g.MapPost("{id:guid}/members", async (Guid id, UserIdRequest r, HttpContext c, ServerService s, CancellationToken ct)
            => (await s.AddMemberAsync(c.User.GetUserId(), id, r.UserId, ct)).ToHttp());
        g.MapDelete("{id:guid}/members/{userId:guid}", async (Guid id, Guid userId, HttpContext c, ServerService s, CancellationToken ct)
            => (await s.RemoveMemberAsync(c.User.GetUserId(), id, userId, ct)).ToHttp());
        g.MapPut("{id:guid}/members/{userId:guid}/role", async (Guid id, Guid userId, ServerRoleRequest r, HttpContext c, ServerService s, CancellationToken ct)
            => (await s.SetRoleAsync(c.User.GetUserId(), id, userId, r.Role, ct)).ToHttp());
        g.MapPut("{id:guid}/owner", async (Guid id, UserIdRequest r, HttpContext c, ServerService s, CancellationToken ct)
            => (await s.AssignOwnerAsync(c.User.GetUserId(), id, r.UserId, ct)).ToHttp());
        g.MapGet("{id:guid}/bans", async (Guid id, HttpContext c, ServerService s, CancellationToken ct)
            => (await s.ListBansAsync(c.User.GetUserId(), id, ct)).ToHttp());
        g.MapPost("{id:guid}/bans", async (Guid id, ServerBanRequest r, HttpContext c, ServerService s, CancellationToken ct)
            => (await s.BanAsync(c.User.GetUserId(), id, r.UserId, r.Reason, ct)).ToHttp());
        g.MapDelete("{id:guid}/bans/{userId:guid}", async (Guid id, Guid userId, HttpContext c, ServerService s, CancellationToken ct)
            => (await s.UnbanAsync(c.User.GetUserId(), id, userId, ct)).ToHttp());

        // ---- Mời vào server / xin vào server ----
        g.MapPost("{id:guid}/invites", async (Guid id, UserIdRequest r, HttpContext c, JoinRequestService s, CancellationToken ct)
            => (await s.InviteAsync(c.User.GetUserId(), id, r.UserId, ct)).ToHttp());
        g.MapPost("{id:guid}/join-requests", async (Guid id, HttpContext c, JoinRequestService s, CancellationToken ct)
            => (await s.RequestToJoinAsync(c.User.GetUserId(), id, ct)).ToHttp());
        g.MapGet("{id:guid}/join-requests", async (Guid id, HttpContext c, JoinRequestService s, CancellationToken ct)
            => (await s.ListForServerAsync(c.User.GetUserId(), id, ct)).ToHttp());

        var jr = app.MapGroup("/api/join-requests").RequireAuthorization();
        jr.MapGet("invitations", async (HttpContext c, JoinRequestService s, CancellationToken ct)
            => Results.Ok(await s.ListInvitationsAsync(c.User.GetUserId(), ct)));
        jr.MapGet("mine", async (HttpContext c, JoinRequestService s, CancellationToken ct)
            => Results.Ok(await s.ListMineAsync(c.User.GetUserId(), ct)));
        jr.MapPost("{id:guid}/respond", async (Guid id, RespondRequest r, HttpContext c, JoinRequestService s, CancellationToken ct)
            => (await s.RespondAsync(c.User.GetUserId(), id, r.Accept, ct)).ToHttp());
        jr.MapPost("{id:guid}/cancel", async (Guid id, HttpContext c, JoinRequestService s, CancellationToken ct)
            => (await s.CancelAsync(c.User.GetUserId(), id, ct)).ToHttp());

        // ---- Admin hệ thống ----
        var admin = app.MapGroup("/api/admin").RequireAuthorization("Admin");
        admin.MapGet("servers", async (string? q, HttpContext c, ServerService s, CancellationToken ct)
            => Results.Ok(await s.ListAllAsync(c.User.GetUserId(), q, ct)));
        admin.MapGet("settings", async (SettingsService s, CancellationToken ct) => Results.Ok(await s.ListAsync(ct)));
        admin.MapPut("settings/{key}", async (string key, SettingRequest r, HttpContext c, SettingsService s, CancellationToken ct)
            => (await s.SetAsync(c.User.GetUserId(), key, r.Value, ct)).ToHttp());
    }
}
