import type { AppEventBus } from '@/shared/event-bus';
import type { Message } from '@/modules/chat';
import type { DirectChat } from '../domain/models';
import { sortChats, upsertChat } from '../domain/rules';
import type { DirectRepository } from './ports';
import { resetDirectStore, useDirectStore } from './directStore';

/** Chat 1-1 (tầng Application): danh sách cuộc trò chuyện, mở chat với bạn, theo dõi tin mới / chưa đọc. */
export class DirectService {
  constructor(
    private readonly repo: DirectRepository,
    private readonly bus: AppEventBus,
  ) {
    bus.subscribe('auth.loggedIn', ({ user }) => {
      useDirectStore.setState({ meId: user.id });
      void this.load();
    });
    bus.subscribe('auth.loggedOut', () => resetDirectStore());
    // Tin chat 1-1 có serverId rỗng (kênh nhóm thì có serverId)
    bus.subscribe('chat.message.created', ({ message }) => {
      if (!message.serverId) this.onMessage(message);
    });
    bus.subscribe('user.profileChanged', ({ user }) =>
      useDirectStore.setState((s) => ({ chats: s.chats.map((c) => (c.user.id === user.id ? { ...c, user: { ...c.user, ...user } } : c)) })),
    );
    bus.subscribe('friend.removed', ({ userId }) => this.setFriend(userId, false));
    bus.subscribe('friend.added', ({ friend }) => this.setFriend(friend.user.id, true));
  }

  async load(): Promise<void> {
    try {
      useDirectStore.setState({ chats: sortChats(await this.repo.list()), loaded: true });
    } catch {
      useDirectStore.setState({ loaded: true });
    }
  }

  async open(userId: string): Promise<DirectChat> {
    const chat = await this.repo.open(userId);
    useDirectStore.setState((s) => ({ chats: upsertChat(s.chats, chat) }));
    return chat;
  }

  /** Mở một cuộc trò chuyện (null = rời khỏi). Mở thì coi như đã đọc. */
  setActive(id: string | null): void {
    useDirectStore.setState((s) => ({
      activeId: id,
      chats: id ? s.chats.map((c) => (c.id === id ? { ...c, hasUnread: false } : c)) : s.chats,
    }));
    if (id) this.bus.publish('direct.read', { conversationId: id });
  }

  private onMessage(message: Message): void {
    const s = useDirectStore.getState();
    const chat = s.chats.find((c) => c.id === message.channelId);
    if (!chat) return void this.load(); // người kia vừa mở cuộc trò chuyện mới với mình
    const mine = message.author.id === s.meId;
    const viewing = s.activeId === chat.id;
    useDirectStore.setState({
      chats: upsertChat(s.chats, { ...chat, lastMessageAt: message.createdAt, hasUnread: viewing || mine ? chat.hasUnread : true }),
    });
    if (viewing && !mine) this.bus.publish('direct.read', { conversationId: chat.id }); // đang xem → lưu mốc đã đọc
  }

  private setFriend(userId: string, isFriend: boolean): void {
    useDirectStore.setState((s) => ({ chats: s.chats.map((c) => (c.user.id === userId ? { ...c, isFriend } : c)) }));
  }
}
