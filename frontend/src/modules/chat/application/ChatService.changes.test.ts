import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@/shared/event-bus/EventBus';
import type { AppEvents } from '@/shared/event-bus';
import type { Message } from '../domain/models';
import type { FileStorage, MessageRepository } from './ports';
import { ChatService } from './ChatService';
import { patchHistory, resetChatStore, useChatStore } from './chatStore';

const user = (id: string) => ({ id, displayName: `Tên ${id}`, username: id, avatarUrl: '' });
const msg = (id: string, over: Partial<Message> = {}): Message => ({
  id, channelId: 'c1', serverId: 's1', author: user('u1'), content: `nội dung ${id}`, attachments: [], createdAt: `2026-10-21T10:0${id.length}:00Z`, ...over,
});

describe('ChatService: tin bị sửa / xóa / ghim / cảm xúc', () => {
  let bus: EventBus<AppEvents>;
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let svc: ChatService;

  beforeEach(() => {
    resetChatStore();
    bus = new EventBus<AppEvents>();
    repo = {
      edit: vi.fn(), remove: vi.fn(() => Promise.resolve()), setPinned: vi.fn(() => Promise.resolve()), react: vi.fn(() => Promise.resolve()),
      listPins: vi.fn(() => Promise.resolve([msg('p1', { pinned: true })])), markRead: vi.fn(() => Promise.resolve()),
    };
    svc = new ChatService(repo as unknown as MessageRepository, {} as FileStorage, bus, { subscribe: vi.fn(), publish: vi.fn() } as never);
    useChatStore.setState({ me: user('me') });
    patchHistory('c1', () => ({ loaded: true, messages: [msg('a'), msg('b', { author: user('u2') })] }));
  });

  const hist = () => useChatStore.getState().history.c1.messages;

  it('realtime: sửa tin → nội dung mới + đã chỉnh sửa, các tin khác giữ nguyên', () => {
    bus.publish('chat.message.changed', { message: msg('a', { content: 'đã sửa', editedAt: '2026-10-21T11:00:00Z' }) });
    expect(hist()[0]).toMatchObject({ id: 'a', content: 'đã sửa', editedAt: '2026-10-21T11:00:00Z' });
    expect(hist()[1].content).toBe('nội dung b');
  });

  it('realtime: tin chưa tải thì không bị thêm vào lịch sử', () => {
    bus.publish('chat.message.changed', { message: msg('zzzz') });
    expect(hist().map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('realtime: xóa tin → đánh dấu deleted', () => {
    bus.publish('chat.message.changed', { message: msg('a', { deleted: true, content: '' }) });
    expect(hist()[0]).toMatchObject({ deleted: true, content: '' });
  });

  it('ghim: tin vào danh sách ghim (nếu đã mở), bỏ ghim hoặc xóa thì ra khỏi danh sách', async () => {
    await svc.loadPins('c1');
    expect(useChatStore.getState().pins.c1.map((m) => m.id)).toEqual(['p1']);
    bus.publish('chat.message.changed', { message: msg('a', { pinned: true }) });
    expect(useChatStore.getState().pins.c1.map((m) => m.id)).toEqual(['a', 'p1']);
    bus.publish('chat.message.changed', { message: msg('a', { pinned: false }) });
    expect(useChatStore.getState().pins.c1.map((m) => m.id)).toEqual(['p1']);
    bus.publish('chat.message.changed', { message: msg('p1', { pinned: true, deleted: true }) });
    expect(useChatStore.getState().pins.c1).toEqual([]);
  });

  it('sửa: gọi server rồi cập nhật; nội dung rỗng bị chặn trước khi gọi', async () => {
    repo.edit.mockResolvedValueOnce(msg('a', { content: 'mới', editedAt: 'x' }));
    await svc.edit(hist()[0], '  mới  ');
    expect(repo.edit).toHaveBeenCalledWith('a', 'mới');
    expect(hist()[0].content).toBe('mới');
    await expect(svc.edit(hist()[0], '   ')).rejects.toThrow(/trống/);
    expect(repo.edit).toHaveBeenCalledTimes(1);
  });

  it('xóa / ghim: cập nhật ngay trên giao diện sau khi server đồng ý', async () => {
    await svc.remove(hist()[0]);
    expect(hist()[0]).toMatchObject({ deleted: true, content: '' });
    await svc.setPinned(hist()[1], true);
    expect(hist()[1].pinned).toBe(true);
  });

  it('cảm xúc: hiện ngay (lạc quan); server lỗi thì hoàn tác và ném lỗi', async () => {
    const p = svc.react(hist()[0], '👍');
    expect(hist()[0].reactions).toEqual([{ emoji: '👍', count: 1, userIds: ['me'] }]); // chưa chờ server
    await p;
    expect(repo.react).toHaveBeenCalledWith('a', '👍');

    repo.react.mockRejectedValueOnce(new Error('lỗi mạng'));
    await expect(svc.react(hist()[1], '❤️')).rejects.toThrow('lỗi mạng');
    expect(hist()[1].reactions ?? []).toEqual([]); // đã hoàn tác
  });

  it('bấm lần 2 vào cảm xúc của mình thì gỡ', async () => {
    await svc.react(hist()[0], '👍');
    await svc.react(hist()[0], '👍');
    expect(hist()[0].reactions).toEqual([]);
  });

  it('ai đó đổi tên / ảnh → cập nhật người gửi trong mọi tin đã tải và trong "me"', () => {
    useChatStore.setState({ me: user('u1') });
    bus.publish('user.profileChanged', { user: { id: 'u1', displayName: 'Tên Mới', username: 'an', avatarUrl: '/avatars/av-02.svg' } });
    expect(hist()[0].author).toMatchObject({ displayName: 'Tên Mới', avatarUrl: '/avatars/av-02.svg' });
    expect(hist()[1].author.displayName).toBe('Tên u2'); // người khác không đổi
    expect(useChatStore.getState().me?.displayName).toBe('Tên Mới');
  });
});
