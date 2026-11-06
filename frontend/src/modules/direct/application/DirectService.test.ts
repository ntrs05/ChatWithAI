import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@/shared/event-bus/EventBus';
import type { AppEvents } from '@/shared/event-bus';
import type { DirectChat } from '../domain/models';
import type { DirectRepository } from './ports';
import { DirectService } from './DirectService';
import { resetDirectStore, useDirectStore } from './directStore';

const chat = (id: string, last: string | null, extra: Partial<DirectChat> = {}): DirectChat => ({
  id, user: { id: `u-${id}`, displayName: `Người ${id}`, username: id, avatarUrl: '' }, lastMessageAt: last, hasUnread: false, isFriend: true, ...extra,
});
const message = (channelId: string, authorId: string, at: string) =>
  ({ id: `m-${at}`, channelId, serverId: '', author: { id: authorId, displayName: '', username: '', avatarUrl: '' }, content: 'hi', attachments: [], createdAt: at }) as never;

describe('DirectService', () => {
  let bus: EventBus<AppEvents>;
  let repo: { list: ReturnType<typeof vi.fn>; open: ReturnType<typeof vi.fn> };
  let reads: string[];

  beforeEach(() => {
    resetDirectStore();
    bus = new EventBus<AppEvents>();
    repo = { list: vi.fn(() => Promise.resolve([chat('a', '2026-01-01T00:00:00Z'), chat('b', '2026-02-01T00:00:00Z')])), open: vi.fn() };
    reads = [];
    bus.subscribe('direct.read', ({ conversationId }) => reads.push(conversationId));
    new DirectService(repo as unknown as DirectRepository, bus);
    useDirectStore.setState({ meId: 'me' });
  });

  it('đăng nhập → tải danh sách, tin mới nhất lên trước', async () => {
    bus.publish('auth.loggedIn', { user: { id: 'me' } as never, token: 't' });
    await vi.waitFor(() => expect(useDirectStore.getState().loaded).toBe(true));
    expect(useDirectStore.getState().chats.map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('tin của người kia khi mình không mở chat đó → đánh dấu chưa đọc và đưa lên đầu', () => {
    useDirectStore.setState({ chats: [chat('b', '2026-02-01T00:00:00Z'), chat('a', '2026-01-01T00:00:00Z')] });
    bus.publish('chat.message.created', { message: message('a', 'u-a', '2026-03-01T00:00:00Z') });
    const { chats } = useDirectStore.getState();
    expect(chats.map((c) => c.id)).toEqual(['a', 'b']);
    expect(chats[0].hasUnread).toBe(true);
  });

  it('tin của chính mình thì không tính chưa đọc', () => {
    useDirectStore.setState({ chats: [chat('a', null)] });
    bus.publish('chat.message.created', { message: message('a', 'me', '2026-03-01T00:00:00Z') });
    expect(useDirectStore.getState().chats[0].hasUnread).toBe(false);
  });

  it('đang xem chat đó: không chưa đọc, và lưu mốc đã đọc', () => {
    useDirectStore.setState({ chats: [chat('a', null)], activeId: 'a' });
    bus.publish('chat.message.created', { message: message('a', 'u-a', '2026-03-01T00:00:00Z') });
    expect(useDirectStore.getState().chats[0].hasUnread).toBe(false);
    expect(reads).toEqual(['a']);
  });

  it('tin kênh server (có serverId) bị bỏ qua', () => {
    useDirectStore.setState({ chats: [chat('a', null)] });
    bus.publish('chat.message.created', { message: { ...(message('a', 'u-a', 'x') as object), serverId: 's1' } as never });
    expect(useDirectStore.getState().chats[0].hasUnread).toBe(false);
  });

  it('cuộc trò chuyện mới do người kia mở → tải lại danh sách', async () => {
    useDirectStore.setState({ chats: [] });
    bus.publish('chat.message.created', { message: message('new', 'u-new', '2026-03-01T00:00:00Z') });
    await vi.waitFor(() => expect(repo.list).toHaveBeenCalled());
  });

  it('mở chat = đã đọc + phát direct.read; hủy kết bạn / kết bạn lại cập nhật isFriend', () => {
    useDirectStore.setState({ chats: [chat('a', null, { hasUnread: true })] });
    new DirectService(repo as unknown as DirectRepository, bus).setActive('a');
    expect(useDirectStore.getState().chats[0].hasUnread).toBe(false);
    expect(reads).toContain('a');

    bus.publish('friend.removed', { userId: 'u-a' });
    expect(useDirectStore.getState().chats[0].isFriend).toBe(false);
    bus.publish('friend.added', { friend: { id: 'f', user: { id: 'u-a' } as never, since: '' }, requestId: 'r' });
    expect(useDirectStore.getState().chats[0].isFriend).toBe(true);
  });
});
