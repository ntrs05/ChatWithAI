using Microsoft.EntityFrameworkCore;

namespace Nebula.Messaging.Infrastructure;

// TODO: bảng msg_categories, msg_conversations, msg_conversation_members, msg_channel_members, msg_messages, msg_message_mentions, msg_message_reactions, msg_message_attachments, msg_pinned_messages (tên như ERD)
//       xong thì chạy dotnet ef migrations add InitialCreate
public sealed class MessagingDbContext(DbContextOptions<MessagingDbContext> options) : DbContext(options)
{
}
