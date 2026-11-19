import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@/shared/event-bus/EventBus';
import type { AppEvents } from '@/shared/event-bus';
import type { AppNotification } from '../domain/models';
import type { NotificationRepository } from './ports';
import { NotificationService } from './NotificationService';
import { resetNotificationStore, useNotificationStore } from './notificationStore';

const note = (id: string, over: Partial<AppNotification> = {}): AppNotification => ({
  id, type: 'DirectMessage', title: 't', body: 'xin chào', refType: 'Conversation', refId: 'c1', actor: { id: 'u2', displayName: 'Minh', username: 'minh', avatarUrl: '' },
  createdAt: `2026-10-21T10:00:0${id.length}Z`, isRead: false, ...over,
});

describe('NotificationService', () => {
  let bus: EventBus<AppEvents>;
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let toasts: string[];

  beforeEach(() => {
    resetNotificationStore();
    bus = new EventBus<AppEvents>();
    repo = {
      list: vi.fn(() => Promise.resolve([note('a'), note('bb')])),
      unreadCount: vi.fn(() => Promise.resolve(5)),
      markRead: vi.fn(() => Promise.resolve()),
      markAllRead: vi.fn(() => Promise.resolve()),
    };
    toasts = [];
    bus.subscribe('ui.toast', ({ message }) => toasts.push(message));
    new NotificationService(repo as unknown as NotificationRepository, bus);
  });

  it('đăng nhập → tải danh sách và số chưa đọc (đếm trên server)', async () => {
    bus.publish('auth.loggedIn', { user: { id: 'me' } as never, token: 't' });
    await vi.waitFor(() => expect(useNotificationStore.getState().loaded).toBe(true));
    expect(useNotificationStore.getState()).toMatchObject({ unread: 5, hasMore: false });
    expect(useNotificationStore.getState().items).toHaveLength(2);
  });

  it('thông báo mới realtime: lên đầu, tăng số chưa đọc; nhận lại cùng id thì không đếm đôi', () => {
    bus.publish('notification.received', { notification: note('ccc', { createdAt: '2026-10-22T00:00:00Z' }) });
    expect(useNotificationStore.getState().items[0].id).toBe('ccc');
    expect(useNotificationStore.getState().unread).toBe(1);
    bus.publish('notification.received', { notification: note('ccc', { createdAt: '2026-10-22T00:00:00Z' }) });
    expect(useNotificationStore.getState().unread).toBe(1);
    expect(useNotificationStore.getState().items).toHaveLength(1);
  });

  it('chỉ toast khi được nhắc tên (tin nhắn riêng đã có chấm đỏ riêng)', () => {
    bus.publish('notification.received', { notification: note('x1', { type: 'DirectMessage' }) });
    expect(toasts).toEqual([]);
    bus.publish('notification.received', { notification: note('x2', { type: 'Mention', body: 'chào <@0195a1b2-1111-7222-8333-444455556666>' }) });
    expect(toasts).toEqual(['Minh: chào @người-dùng']);
  });

  it('đánh dấu đã đọc từng cái: giảm số chưa đọc đúng một lần, gọi server', async () => {
    useNotificationStore.setState({ items: [note('a'), note('bb', { isRead: true })], unread: 1 });
    const svc = new NotificationService(repo as unknown as NotificationRepository, bus);
    await svc.markRead(note('a'));
    expect(useNotificationStore.getState()).toMatchObject({ unread: 0 });
    expect(useNotificationStore.getState().items[0].isRead).toBe(true);
    expect(repo.markRead).toHaveBeenCalledWith('a');
    await svc.markRead({ ...note('bb'), isRead: true }); // đã đọc rồi: không làm gì
    expect(repo.markRead).toHaveBeenCalledTimes(1);
  });

  it('đánh dấu tất cả đã đọc; server lỗi thì hoàn tác', async () => {
    useNotificationStore.setState({ items: [note('a'), note('bb')], unread: 2 });
    const svc = new NotificationService(repo as unknown as NotificationRepository, bus);
    await svc.markAllRead();
    expect(useNotificationStore.getState()).toMatchObject({ unread: 0 });
    expect(useNotificationStore.getState().items.every((n) => n.isRead)).toBe(true);

    useNotificationStore.setState({ items: [note('a'), note('bb')], unread: 2 });
    repo.markAllRead.mockRejectedValueOnce(new Error('mất mạng'));
    await svc.markAllRead();
    expect(useNotificationStore.getState()).toMatchObject({ unread: 2 });
    expect(toasts[toasts.length - 1]).toMatch(/mất mạng/);
  });

  it('mở đúng cuộc trò chuyện / kênh đó thì thông báo của nó tự được đánh dấu đã đọc', () => {
    useNotificationStore.setState({ items: [note('a', { refId: 'c1' }), note('bb', { refId: 'c2' })], unread: 2 });
    bus.publish('direct.read', { conversationId: 'c1' });
    expect(useNotificationStore.getState().items.map((n) => n.isRead)).toEqual([true, false]);
    expect(useNotificationStore.getState().unread).toBe(1);
    expect(repo.markRead).toHaveBeenCalledWith('a');
    bus.publish('channel.selected', { serverId: 's', channel: { id: 'c2' } as never });
    expect(useNotificationStore.getState().unread).toBe(0);
  });

  it('xem thêm: nối tiếp, không trùng', async () => {
    useNotificationStore.setState({ items: [note('a')], unread: 0, hasMore: true, loaded: true });
    repo.list.mockResolvedValueOnce([note('a'), note('dddd')]);
    await new NotificationService(repo as unknown as NotificationRepository, bus).loadMore();
    expect(useNotificationStore.getState().items.map((n) => n.id)).toEqual(['a', 'dddd']);
    expect(repo.list).toHaveBeenCalledWith({ skip: 1, take: 30 });
  });

  it('đăng xuất → xóa sạch', () => {
    useNotificationStore.setState({ items: [note('a')], unread: 3, loaded: true });
    bus.publish('auth.loggedOut', {});
    expect(useNotificationStore.getState()).toMatchObject({ items: [], unread: 0, loaded: false });
  });
});
