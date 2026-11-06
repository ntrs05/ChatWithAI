// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetNotificationStore, useNotificationStore } from '../application/notificationStore';
import type { AppNotification } from '../domain/models';
import { NotificationsView } from './NotificationsView';

const svc = vi.hoisted(() => ({
  markRead: vi.fn((_n: unknown) => Promise.resolve()),
  markAllRead: vi.fn(() => Promise.resolve()),
  loadMore: vi.fn(() => Promise.resolve()),
}));
vi.mock('../module', () => ({ notificationService: () => svc }));

const note = (id: string, over: Partial<AppNotification> = {}): AppNotification => ({
  id, type: 'Mention', title: 'Bạn được nhắc đến', body: 'Họp lúc 9h', refType: 'Conversation', refId: 'c1',
  actor: { id: 'u2', displayName: 'Minh', username: 'minh', avatarUrl: '' }, createdAt: new Date().toISOString(), isRead: false, ...over,
});

beforeEach(() => {
  resetNotificationStore();
  Object.values(svc).forEach((f) => f.mockClear());
});
afterEach(cleanup);

describe('trang Thông báo', () => {
  it('chưa tải xong: vòng quay; tải xong mà rỗng: gợi ý', () => {
    useNotificationStore.setState({ loaded: false });
    const { unmount } = render(<NotificationsView onOpen={() => {}} />);
    expect(screen.getByLabelText('Đang tải')).toBeTruthy();
    unmount();
    useNotificationStore.setState({ loaded: true });
    render(<NotificationsView onOpen={() => {}} />);
    expect(screen.getByText('Chưa có thông báo nào')).toBeTruthy();
  });

  it('hiện tiêu đề ghép tên người gây ra, nội dung, gom theo ngày "Hôm nay"', () => {
    useNotificationStore.setState({ loaded: true, items: [note('a')], unread: 1 });
    render(<NotificationsView onOpen={() => {}} />);
    expect(screen.getByText('Minh đã nhắc đến bạn')).toBeTruthy();
    expect(screen.getByText('Họp lúc 9h')).toBeTruthy();
    expect(screen.getByText('Hôm nay')).toBeTruthy();
    expect(screen.getByLabelText('Chưa đọc')).toBeTruthy();
  });

  it('bấm vào một thông báo: đánh dấu đã đọc và mở đúng nơi', () => {
    const open = vi.fn();
    const n = note('a');
    useNotificationStore.setState({ loaded: true, items: [n], unread: 1 });
    render(<NotificationsView onOpen={open} />);
    fireEvent.click(screen.getByText('Minh đã nhắc đến bạn'));
    expect(svc.markRead).toHaveBeenCalledWith(n);
    expect(open).toHaveBeenCalledWith(n);
  });

  it('tab Chưa đọc chỉ hiện thông báo chưa đọc; hết thì báo "đã đọc hết"', async () => {
    useNotificationStore.setState({ loaded: true, items: [note('a'), note('bb', { title: 'Đã đọc rồi', actor: null, isRead: true, body: 'cũ' })], unread: 1 });
    render(<NotificationsView onOpen={() => {}} />);
    expect(screen.getByText('Đã đọc rồi')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Chưa đọc/ }));
    expect(screen.queryByText('Đã đọc rồi')).toBeNull();
    expect(screen.getByText('Minh đã nhắc đến bạn')).toBeTruthy();

    useNotificationStore.setState({ items: [note('bb', { isRead: true })], unread: 0 });
    expect(await screen.findByText('Bạn đã đọc hết thông báo')).toBeTruthy();
  });

  it('"Đánh dấu tất cả đã đọc": khóa khi không còn gì chưa đọc', () => {
    useNotificationStore.setState({ loaded: true, items: [note('a')], unread: 1 });
    const { unmount } = render(<NotificationsView onOpen={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Đánh dấu tất cả đã đọc/ }));
    expect(svc.markAllRead).toHaveBeenCalledTimes(1);
    unmount();
    useNotificationStore.setState({ unread: 0 });
    render(<NotificationsView onOpen={() => {}} />);
    expect((screen.getByRole('button', { name: /Đánh dấu tất cả đã đọc/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('"Xem thêm" chỉ hiện khi còn trang sau và gọi loadMore', () => {
    useNotificationStore.setState({ loaded: true, items: [note('a')], unread: 0, hasMore: false });
    const { unmount } = render(<NotificationsView onOpen={() => {}} />);
    expect(screen.queryByText('Xem thêm')).toBeNull();
    unmount();
    useNotificationStore.setState({ hasMore: true });
    render(<NotificationsView onOpen={() => {}} />);
    fireEvent.click(screen.getByText('Xem thêm'));
    expect(svc.loadMore).toHaveBeenCalled();
  });
});
