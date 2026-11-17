using Nebula.Shared.Kernel;

namespace Nebula.Messaging.Domain;

public enum ConversationType
{
    // TODO: giá trị lấy theo ERD
}

public enum ChannelKind
{
    // TODO: giá trị lấy theo ERD
}

// TODO: Create
public sealed class Category : Entity
{
}

// TODO: CreateChannel, CreateDirect, KeyFor, DirectParticipants, OtherParticipant, SetPrivate
//       UpdateChannel
public sealed class Conversation : Entity
{
}

// TODO: Create, MarkRead, SetArchived, Clear
public sealed class ConversationMember
{
}

// TODO: Create
public sealed class ChannelMember
{
}
