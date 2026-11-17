using Microsoft.AspNetCore.Routing;
using Nebula.Shared.Infrastructure;

namespace Nebula.Messaging.Api;

// TODO: request gồm (Guid UserId)
public sealed record UserIdRequest
{
}

// TODO: request gồm (string Content)
public sealed record EditMessageRequest
{
}

// TODO: request gồm (string Emoji)
public sealed record ReactRequest
{
}

// TODO: request gồm (bool Archived)
public sealed record ArchiveRequest
{
}

// TODO: request gồm (string ClientId)
public sealed record VoiceTokenRequest
{
}

// TODO: request gồm (string ClientId, bool Muted, bool Deafened)
public sealed record VoiceStateRequest
{
}

internal sealed class MessagingEndpoints : IModuleEndpoints
{
    public void Map(IEndpointRouteBuilder app)
    {
        // TODO: làm mấy route dưới, nghiệp vụ xem đặc tả UC07, UC08, UC10, UC11, UC12, UC16 (kênh), UC17.
        // Nhớ gắn RequireAuthorization() cho route cần đăng nhập, route admin thì RequireAuthorization("Admin").
        //   HUB    /hubs/chat  (ChatHub)
        //   GET    /api/servers/{serverId:guid}/channels
        //   POST   /api/servers/{serverId:guid}/categories
        //   DELETE /api/categories/{id:guid}
        //   POST   /api/servers/{serverId:guid}/channels
        //   PUT    /api/channels/{id:guid}
        //   DELETE /api/channels/{id:guid}
        //   GET    /api/channels/{id:guid}/members
        //   POST   /api/channels/{id:guid}/members
        //   DELETE /api/channels/{id:guid}/members/{userId:guid}
        //   POST   /api/direct
        //   GET    /api/direct
        //   PUT    /api/direct/{id:guid}/archive
        //   DELETE /api/direct/{id:guid}
        //   GET    /api/conversations/{id:guid}/messages
        //   POST   /api/conversations/{id:guid}/messages
        //   GET    /api/conversations/{id:guid}/history
        //   GET    /api/conversations/{id:guid}/pins
        //   PUT    /api/conversations/{id:guid}/read
        //   GET    /api/messages/{id:guid}
        //   PUT    /api/messages/{id:guid}
        //   DELETE /api/messages/{id:guid}
        //   PUT    /api/messages/{id:guid}/pin
        //   DELETE /api/messages/{id:guid}/pin
        //   POST   /api/messages/{id:guid}/reactions
        //   GET    /api/servers/{serverId:guid}/voice-states
        //   POST   /api/channels/{id:guid}/voice/join
        //   POST   /api/channels/{id:guid}/voice/leave
        //   POST   /api/channels/{id:guid}/voice/token
        //   PUT    /api/channels/{id:guid}/voice/state
        //   GET    /api/search
    }
}
