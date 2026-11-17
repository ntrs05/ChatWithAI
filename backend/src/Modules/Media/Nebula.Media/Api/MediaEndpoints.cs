using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Nebula.Media.Application;
using Nebula.Shared.Infrastructure;

namespace Nebula.Media.Api;

internal sealed class MediaEndpoints : IModuleEndpoints
{
    public void Map(IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/files").RequireAuthorization();

        // multipart, field "file"; dùng JWT nên tắt antiforgery
        g.MapPost("", async (IFormFile file, HttpContext c, MediaService s, CancellationToken ct) =>
        {
            await using var stream = file.OpenReadStream();
            return (await s.UploadAsync(c.User.GetUserId(), file.FileName, file.ContentType, file.Length, stream, ct)).ToHttp();
        }).DisableAntiforgery();

        g.MapGet("", async (HttpContext c, MediaService s, CancellationToken ct)
            => Results.Ok(await s.ListMineAsync(c.User.GetUserId(), ct)));
        g.MapGet("quota", async (HttpContext c, MediaService s, CancellationToken ct)
            => Results.Ok(await s.GetQuotaAsync(c.User.GetUserId(), ct)));

        // luôn trả về dạng tải xuống
        g.MapGet("{id:guid}", async (Guid id, MediaService s, CancellationToken ct) =>
        {
            var r = await s.OpenAsync(id, ct);
            if (r.IsFailure) return r.ToHttp();
            var (file, content) = r.Value;
            return Results.File(content, file.ContentType, file.FileName);
        });

        g.MapDelete("{id:guid}", async (Guid id, HttpContext c, MediaService s, CancellationToken ct)
            => (await s.DeleteAsync(c.User.GetUserId(), id, ct)).ToHttp());

        // avatar: upload cần đăng nhập, xem thì công khai
        var av = app.MapGroup("/api/avatars");
        av.MapPost("", async (IFormFile file, HttpContext c, MediaService s, CancellationToken ct) =>
        {
            await using var stream = file.OpenReadStream();
            return (await s.UploadAvatarAsync(c.User.GetUserId(), file.FileName, file.ContentType, file.Length, stream, ct)).ToHttp();
        }).RequireAuthorization().DisableAntiforgery();
        av.MapGet("{id:guid}", async (Guid id, HttpContext http, MediaService s, CancellationToken ct) =>
        {
            var r = await s.OpenAvatarAsync(id, ct);
            if (r.IsFailure) return r.ToHttp();
            var (file, content) = r.Value;
            http.Response.Headers["Cache-Control"] = "public, max-age=86400";
            http.Response.Headers["X-Content-Type-Options"] = "nosniff";
            return Results.File(content, file.ContentType);   // đã check là ảnh nên cho hiển thị luôn
        }).AllowAnonymous();

        // admin xem / đặt hạn mức từng người
        var admin = app.MapGroup("/api/admin/users/{userId:guid}/quota").RequireAuthorization("Admin");
        admin.MapGet("", async (Guid userId, MediaService s, CancellationToken ct) => Results.Ok(await s.GetQuotaAsync(userId, ct)));
        admin.MapPut("", async (Guid userId, SetQuotaRequest r, HttpContext c, MediaService s, CancellationToken ct)
            => (await s.SetQuotaAsync(c.User.GetUserId(), userId, r.QuotaMb, ct)).ToHttp());
    }
}
