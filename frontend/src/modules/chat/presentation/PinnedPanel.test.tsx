// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetChatStore, useChatStore } from '../application/chatStore';
import type { Message } from '../domain/models';
import { PinnedButton } from './PinnedPanel';

const svc = vi.hoisted(() => ({
  loadPins: vi.fn((_c: string) => Promise.resolve()),
  setPinned: vi.fn((_m: unknown, _p: boolean) => Promise.resolve()),
  ensureLoaded: vi.fn((_c: string, _m: string) => Promise.resolve(true)),
}));
vi.mock('../module', () => ({ chatService: () => svc }));
vi.mock('@/shared/config', () => ({ config: { maxUploadBytes: 1, apiBaseUrl: '/api', messagePageSize: 30 } }));
vi.mock('@/shared/event-bus', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const pin = (id: string, text: string): Message => ({
  id, channelId: 'c1', serverId: 's1', author: { id: 'u1', displayName: 'An', username: 'an', avatarUrl: '' }, content: text, attachments: [], createdAt: '2026-10-21T10:00:00Z', pinned: true,
});

beforeEach(() => {
  resetChatStore();
  Object.values(svc).forEach((f) => f.mockClear());
});
afterEach(cleanup);

describe('khung "Tin đã ghim"', () => {
  it('mở ra thì tải danh sách; rỗng thì báo chưa có tin nào', async () => {
    render(<PinnedButton channelId="c1" canUnpin={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tin đã ghim' }));
    await waitFor(() => expect(svc.loadPins).toHaveBeenCalledWith('c1'));
    useChatStore.setState({ pins: { c1: [] } });
    expect(await screen.findByText('Chưa có tin nào được ghim.')).toBeTruthy();
  });

  it('liệt kê tin đã ghim (bỏ <@id> thành chữ dễ đọc), "Đi tới" cuộn tới tin đó', async () => {
    useChatStore.setState({ pins: { c1: [pin('p1', 'Họp lúc 9h <@0195a1b2-1111-7222-8333-444455556666>'), pin('p2', 'Nộp bài trước thứ 6')] } });
    render(<PinnedButton channelId="c1" canUnpin={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tin đã ghim' }));
    expect(await screen.findByText('Họp lúc 9h @người-dùng')).toBeTruthy();
    expect(screen.getByText('Nộp bài trước thứ 6')).toBeTruthy();
    fireEvent.click(screen.getAllByText('Đi tới tin nhắn')[1]);
    await waitFor(() => expect(svc.ensureLoaded).toHaveBeenCalledWith('c1', 'p2'));
  });

  it('"Bỏ ghim" chỉ hiện khi có quyền', async () => {
    useChatStore.setState({ pins: { c1: [pin('p1', 'abc')] } });
    const { unmount } = render(<PinnedButton channelId="c1" canUnpin={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tin đã ghim' }));
    await screen.findByText('abc');
    expect(screen.queryByText('Bỏ ghim')).toBeNull();
    unmount();

    render(<PinnedButton channelId="c1" canUnpin />);
    fireEvent.click(screen.getByRole('button', { name: 'Tin đã ghim' }));
    fireEvent.click(await screen.findByText('Bỏ ghim'));
    expect(svc.setPinned).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), false);
  });
});
