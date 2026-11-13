using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Nebula.Identity.Application;
using Nebula.Identity.Domain;
using Nebula.Shared.Infrastructure;

namespace Nebula.Identity.Api;

public sealed record GoogleLoginRequest(string IdToken);
public sealed record SetStatusRequest(UserStatus Status);

internal sealed class IdentityEndpoints : IModuleEndpoints
{
    public void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/google", async (GoogleLoginRequest req, AuthService auth, CancellationToken ct)
            => (await auth.LoginWithGoogleAsync(req.IdToken, ct)).ToHttp()).AllowAnonymous();
        app.MapPost("/api/auth/register", async (RegisterRequest req, AuthService auth, CancellationToken ct)
            => (await auth.RegisterAsync(req, ct)).ToHttp()).AllowAnonymous();
        app.MapPost("/api/auth/login", async (LoginRequest req, AuthService auth, CancellationToken ct)
            => (await auth.LoginAsync(req, ct)).ToHttp()).AllowAnonymous();

        // ---- Hồ sơ của chính mình ----
        var me = app.MapGroup("/api/users/me").RequireAuthorization();
        me.MapGet("", async (HttpContext c, ProfileService s, CancellationToken ct)
            => (await s.GetAsync(c.User.GetUserId(), ct)).ToHttp());
        me.MapPut("", async (UpdateProfileRequest req, HttpContext c, ProfileService s, CancellationToken ct)
            => (await s.UpdateAsync(c.User.GetUserId(), req, ct)).ToHttp());
        me.MapPut("password", async (ChangePasswordRequest req, HttpContext c, ProfileService s, CancellationToken ct)
            => (await s.ChangePasswordAsync(c.User.GetUserId(), req, ct)).ToHttp());
        me.MapPut("status", async (SetStatusRequest req, HttpContext c, ProfileService s, CancellationToken ct)
            => (await s.SetStatusAsync(c.User.GetUserId(), req.Status, ct)).ToHttp());
        me.MapPut("settings", async (UserSettingsRequest req, HttpContext c, ProfileService s, CancellationToken ct)
            => (await s.UpdateSettingsAsync(c.User.GetUserId(), req, ct)).ToHttp());

        // ---- Người dùng khác ----
        var users = app.MapGroup("/api/users").RequireAuthorization();
        // Chỉ admin hệ thống được tìm người theo tên/email. Người dùng thường PHẢI biết cả tên lẫn ID mới kết bạn được (xem /api/friends/requests/by-tag)
        // nên không cho dò danh sách người dùng.
        users.MapGet("search", async (string? q, int? take, ProfileService s, CancellationToken ct)
            => Results.Ok(await s.SearchAsync(q, take ?? 20, ct))).RequireAuthorization("Admin");
        users.MapGet("{id:guid}", async (Guid id, ProfileService s, CancellationToken ct)
            => (await s.GetPublicAsync(id, ct)).ToHttp());

        // ---- Admin hệ thống quản lý tài khoản ----
        var admin = app.MapGroup("/api/admin/users").RequireAuthorization("Admin");
        admin.MapGet("", async (string? q, bool? locked, AdminService s, CancellationToken ct)
            => Results.Ok(await s.ListAsync(q, locked, ct)));
        admin.MapPost("{id:guid}/lock", async (Guid id, LockUserRequest req, HttpContext c, AdminService s, CancellationToken ct)
            => (await s.LockAsync(c.User.GetUserId(), id, req.Reason, ct)).ToHttp());
        admin.MapPost("{id:guid}/unlock", async (Guid id, HttpContext c, AdminService s, CancellationToken ct)
            => (await s.UnlockAsync(c.User.GetUserId(), id, ct)).ToHttp());
    }
}
