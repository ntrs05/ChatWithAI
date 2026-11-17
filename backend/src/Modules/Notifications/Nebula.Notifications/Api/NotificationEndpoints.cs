using Microsoft.AspNetCore.Routing;
using Nebula.Shared.Infrastructure;

namespace Nebula.Notifications.Api;

// TODO: request gồm (bool Value)
public sealed record MentionsOnlyRequest
{
}

internal sealed class NotificationEndpoints : IModuleEndpoints
{
    public void Map(IEndpointRouteBuilder app)
    {
        // TODO: làm mấy route dưới, nghiệp vụ xem đặc tả UC06.
        // Nhớ gắn RequireAuthorization() cho route cần đăng nhập, route admin thì RequireAuthorization("Admin").
        //   GET    /api/notifications
        //   GET    /api/notifications/unread-count
        //   PUT    /api/notifications/{id:guid}/read
        //   PUT    /api/notifications/read-all
        //   GET    /api/notifications/preferences
        //   PUT    /api/notifications/preferences/mentions-only
        //   GET    /api/notifications/servers
        //   PUT    /api/notifications/servers/{serverId:guid}
        //   DELETE /api/notifications/servers/{serverId:guid}
        //   GET    /api/notifications/conversations/{conversationId:guid}
        //   PUT    /api/notifications/conversations/{conversationId:guid}
        //   DELETE /api/notifications/conversations/{conversationId:guid}
    }
}
