using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

internal sealed class BadRequestExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        if (exception is not BadHttpRequestException) return false;
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Request.Invalid",
            Detail = "Dữ liệu gửi lên không hợp lệ."
        }, ct);
        return true;
    }
}
