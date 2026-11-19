using Microsoft.EntityFrameworkCore;
using Nebula.Messaging.Application;
using Nebula.Messaging.Domain;

namespace Nebula.Messaging.Infrastructure;

public sealed class MessagingDbContext(DbContextOptions<MessagingDbContext> options) : DbContext(options), IMessagingUnitOfWork
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ConversationMember> ConversationMembers => Set<ConversationMember>();
    public DbSet<ChannelMember> ChannelMembers => Set<ChannelMember>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<PinnedMessage> PinnedMessages => Set<PinnedMessage>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // id của module khác chỉ là Guid, không có khóa ngoại

        b.Entity<Category>(e =>
        {
            e.ToTable("msg_categories");
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.ServerId);
        });

        b.Entity<Conversation>(e =>
        {
            e.ToTable("msg_conversations");
            e.Property(x => x.Type).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Kind).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.Topic).HasMaxLength(300);
            e.Property(x => x.DirectKey).HasMaxLength(80);
            e.HasIndex(x => x.DirectKey).IsUnique();         // nhiều NULL vẫn hợp lệ trong MySQL
            e.HasIndex(x => x.ServerId);
            // không cho xóa category còn kênh
            e.HasOne<Category>().WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
            e.Ignore(x => x.IsDirect);
        });

        b.Entity<ConversationMember>(e =>
        {
            e.ToTable("msg_conversation_members");
            e.HasKey(x => new { x.ConversationId, x.UserId });
            e.HasIndex(x => x.UserId);
            e.HasOne<Conversation>().WithMany().HasForeignKey(x => x.ConversationId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<ChannelMember>(e =>
        {
            e.ToTable("msg_channel_members");
            e.HasKey(x => new { x.ConversationId, x.UserId });
            e.HasIndex(x => x.UserId);
            e.HasOne<Conversation>().WithMany().HasForeignKey(x => x.ConversationId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Message>(e =>
        {
            e.ToTable("msg_messages");
            e.Property(x => x.Content).HasMaxLength(Message.MaxLength);
            e.HasIndex(x => new { x.ConversationId, x.CreatedAt });   // tải lịch sử theo hội thoại
            e.HasIndex(x => new { x.SenderId, x.CreatedAt });         // lọc tìm kiếm theo người gửi
            e.HasIndex(x => x.ReplyToId);
            e.HasOne<Conversation>().WithMany().HasForeignKey(x => x.ConversationId).OnDelete(DeleteBehavior.Cascade);
            e.Ignore(x => x.IsDeleted);
            // ReplyToId không có FK vì MySQL không cho cascade trên cùng một bảng

            e.HasMany(x => x.Mentions).WithOne().HasForeignKey(x => x.MessageId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Reactions).WithOne().HasForeignKey(x => x.MessageId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Attachments).WithOne().HasForeignKey(x => x.MessageId).OnDelete(DeleteBehavior.Cascade);
            e.Navigation(x => x.Mentions).UsePropertyAccessMode(PropertyAccessMode.Field);
            e.Navigation(x => x.Reactions).UsePropertyAccessMode(PropertyAccessMode.Field);
            e.Navigation(x => x.Attachments).UsePropertyAccessMode(PropertyAccessMode.Field);
        });

        b.Entity<MessageMention>(e =>
        {
            e.ToTable("msg_message_mentions");
            e.HasKey(x => new { x.MessageId, x.UserId });
            e.HasIndex(x => x.UserId);
        });

        b.Entity<MessageReaction>(e =>
        {
            e.ToTable("msg_message_reactions");
            e.HasKey(x => new { x.MessageId, x.UserId, x.Emoji });
            e.Property(x => x.Emoji).HasMaxLength(16);
        });

        b.Entity<MessageAttachment>(e =>
        {
            e.ToTable("msg_message_attachments");
            e.Property(x => x.FileName).HasMaxLength(255).IsRequired();
            e.Property(x => x.ContentType).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.FileId);
        });

        b.Entity<PinnedMessage>(e =>
        {
            e.ToTable("msg_pinned_messages");
            e.HasKey(x => new { x.ConversationId, x.MessageId });
            e.HasOne<Conversation>().WithMany().HasForeignKey(x => x.ConversationId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<Message>().WithMany().HasForeignKey(x => x.MessageId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
