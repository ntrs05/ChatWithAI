import type { AppEventBus } from '@/shared/event-bus';
import { errorMessage } from '@/shared/http';
import type { AppNotification } from '../domain/models';
import { cleanBody, shouldToast, upsertNotification } from '../domain/rules';
import type { NotificationRepository } from './ports';
import { resetNotificationStore, useNotificationStore } from './notificationStore';

const PAGE = 30;

/**
 * Hộp thư thông báo (tầng Application): tải danh sách + số chưa đọc, nhận thông báo mới realtime,
 * đánh dấu đã đọc (từng cái / tất cả / khi mở đúng cuộc trò chuyện đó).
 */
export class NotificationService {
  constructor(
    private readonly repo: NotificationRepository,
    private readonly bus: AppEventBus,
  ) {
    bus.subscribe('auth.loggedIn', () => void this.load());
    bus.subscribe('auth.loggedOut', () => resetNotificationStore());
    bus.subscribe('notification.received', ({ notification }) => {
      useNotificationStore.setState((s) => ({
        items: upsertNotification(s.items, notification),
        unread: s.unread + (notification.isRead || s.items.some((x) => x.id === notification.id) ? 0 : 1),
      }));
      if (shouldToast(notification)) {
        const who = notification.actor?.displayName;
        this.bus.publish('ui.toast', { kind: 'info', message: `${who ? `${who}: ` : ''}${cleanBody(notification.body)}`.slice(0, 120) });
      }
    });
    // Mở đúng kênh / chat 1-1 đó → các thông báo của nó coi như đã đọc
    bus.subscribe('direct.read', ({ conversationId }) => this.markReadByConversation(conversationId));
    bus.subscribe('channel.selected', ({ channel }) => this.markReadByConversation(channel.id));
  }

  async load(): Promise<void> {
    try {
      const [items, unread] = await Promise.all([this.repo.list({ skip: 0, take: PAGE }), this.repo.unreadCount()]);
      useNotificationStore.setState({ items, unread, loaded: true, hasMore: items.length === PAGE });
    } catch {
      useNotificationStore.setState({ loaded: true });
    }
  }

  async loadMore(): Promise<void> {
    const s = useNotificationStore.getState();
    if (s.loadingMore || !s.hasMore) return;
    useNotificationStore.setState({ loadingMore: true });
    try {
      const more = await this.repo.list({ skip: s.items.length, take: PAGE });
      useNotificationStore.setState((cur) => ({
        items: more.reduce((acc, n) => (acc.some((x) => x.id === n.id) ? acc : [...acc, n]), cur.items),
        hasMore: more.length === PAGE,
        loadingMore: false,
      }));
    } catch (err) {
      useNotificationStore.setState({ loadingMore: false });
      this.bus.publish('ui.toast', { kind: 'error', message: errorMessage(err, 'Không tải thêm được thông báo') });
    }
  }

  async markRead(n: AppNotification): Promise<void> {
    if (n.isRead) return;
    this.setRead([n.id]);
    try {
      await this.repo.markRead(n.id);
    } catch {
      /* lần tải lại sau sẽ đồng bộ lại; không làm phiền người dùng */
    }
  }

  async markAllRead(): Promise<void> {
    const before = useNotificationStore.getState();
    useNotificationStore.setState({ items: before.items.map((n) => ({ ...n, isRead: true })), unread: 0 });
    try {
      await this.repo.markAllRead();
    } catch (err) {
      useNotificationStore.setState({ items: before.items, unread: before.unread });
      this.bus.publish('ui.toast', { kind: 'error', message: errorMessage(err, 'Không đánh dấu được') });
    }
  }

  private markReadByConversation(conversationId: string): void {
    const unread = useNotificationStore.getState().items.filter((n) => !n.isRead && n.refType === 'Conversation' && n.refId === conversationId);
    if (unread.length === 0) return;
    this.setRead(unread.map((n) => n.id));
    unread.forEach((n) => void this.repo.markRead(n.id).catch(() => {}));
  }

  private setRead(ids: string[]): void {
    const set = new Set(ids);
    useNotificationStore.setState((s) => {
      const newlyRead = s.items.filter((n) => set.has(n.id) && !n.isRead).length;
      return { items: s.items.map((n) => (set.has(n.id) ? { ...n, isRead: true } : n)), unread: Math.max(0, s.unread - newlyRead) };
    });
  }
}
