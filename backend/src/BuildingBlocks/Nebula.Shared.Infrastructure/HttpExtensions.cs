using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Nebula.Shared.Kernel;

namespace Nebula.Shared.Infrastructure;

public static class HttpExtensions
{
    /// <summary>Lấy Id người dùng từ claim "sub" của JWT.</summary>
    public static Guid GetUserId(this ClaimsPrincipal user)
        => Guid.TryParse(user.FindFirstValue("sub"), out var id) ? id : throw new UnauthorizedAccessException();

    /// <summary>Đổi Result thành HTTP response thống nhất cho mọi module.</summary>
    public static IResult ToHttp(this Result result, Func<IResult>? onSuccess = null)
        => result.IsSuccess ? (onSuccess?.Invoke() ?? Results.NoContent()) : Problem(result.Error);

    public static IResult ToHttp<T>(this Result<T> result)
        => result.IsSuccess ? Results.Ok(result.Value) : Problem(result.Error);

    private static IResult Problem(Error e) => Results.Problem(
        title: e.Code, detail: e.Message,
        statusCode: e.Type switch
        {
            ErrorType.NotFound => StatusCodes.Status404NotFound,
            ErrorType.Forbidden => StatusCodes.Status403Forbidden,
            ErrorType.Conflict => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status400BadRequest
        });
}

public interface IModuleEndpoints
{
    void Map(IEndpointRouteBuilder app);
}
