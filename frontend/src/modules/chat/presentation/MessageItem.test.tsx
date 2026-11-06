// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '../domain/models';
import { MessageItem } from './MessageItem';

const svc = vi.hoisted(() => ({
  edit: vi.fn((_m: unknown, _c: string) => Promise.resolve()),
  remove: vi.fn((_m: unknown) => Promise.resolve()),
  setPinned: vi.fn((_m: unknown, _p: boolean) => Promise.resolve()),
  react: vi.fn((_m: unknown, _e: string) => Promise.resolve()),
  retry: vi.fn(),
  resolveAttachmentUrl: vi.fn(() => Promise.resolve('')),
}));
vi.mock('../module', () => ({ chatService: () => svc }));
vi.mock('@/shared/config', () => ({ config: { maxUploadBytes: 1, apiBaseUrl: '/api', messagePageSize: 30 } }));
const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('@/shared/event-bus', () => ({ toast: toasts }));

const author = (id: string, name: string) => ({ id, displayName: name, username: id, avatarUrl: '' });
const msg = (over: Partial<Message> = {}): Message => ({
  id: 'm1', channelId: 'c1', serverId: 's1', author: author('me', 'Tôi'), content: 'Xin chào mọi người', attachments: [], createdAt: '2026-10-21T10:00:00Z', ...over,
});
const none = { canPin: false, canDeleteOthers: false };
const leader = { canPin: true, canDeleteOthers: true };

beforeEach(() => {
  Object.values(svc).forEach((f) => f.mockClear());
  Object.values(toasts).forEach((f) => f.mockClear());
});
afterEach(cleanup);

const show = (message: Message, perms = none) => render(<MessageItem message={message} showHeader isMine={message.author.id === 'me'} meId="me" permissions={perms} />);
const toolbar = () => screen.queryByRole('toolbar');
const btn = (name: string) => screen.getByRole('button', { name });

describe('tin nhắn: thanh thao tác', () => {
  it('chủ tin: thả cảm xúc, sửa, xóa — không ghim (chưa có quyền)', () => {
    show(msg());
    const t = within(toolbar()!);
    expect(t.getByRole('button', { name: 'Thả cảm xúc' })).toBeTruthy();
    expect(t.getByRole('button', { name: 'Sửa tin nhắn' })).toBeTruthy();
    expect(t.getByRole('button', { name: 'Xóa tin nhắn' })).toBeTruthy();
    expect(t.queryByRole('button', { name: /ghim/i })).toBeNull();
  });

  it('chủ server với tin người khác: ghim + xóa, nhưng KHÔNG sửa', () => {
    show(msg({ author: author('other', 'Người khác') }), leader);
    const t = within(toolbar()!);
    expect(t.getByRole('button', { name: 'Ghim tin nhắn' })).toBeTruthy();
    expect(t.getByRole('button', { name: 'Xóa tin nhắn' })).toBeTruthy();
    expect(t.queryByRole('button', { name: 'Sửa tin nhắn' })).toBeNull();
  });

  it('thành viên thường với tin người khác: chỉ thả cảm xúc', () => {
    show(msg({ author: author('other', 'Người khác') }));
    const t = within(toolbar()!);
    expect(t.getAllByRole('button')).toHaveLength(1);
  });

  it('tin đang gửi / đã xóa: không có thanh thao tác', () => {
    show(msg({ status: 'sending' }));
    expect(toolbar()).toBeNull();
    cleanup();
    show(msg({ deleted: true, content: '' }));
    expect(toolbar()).toBeNull();
    expect(screen.getByText('Tin nhắn đã bị xóa')).toBeTruthy();
  });
});

describe('tin nhắn: sửa', () => {
  it('Sửa → Enter lưu nội dung mới, đóng ô sửa', async () => {
    show(msg());
    fireEvent.click(btn('Sửa tin nhắn'));
    const box = screen.getByLabelText('Nội dung đang sửa') as HTMLTextAreaElement;
    expect(box.value).toBe('Xin chào mọi người');
    fireEvent.change(box, { target: { value: 'Xin chào cả lớp' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(svc.edit).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }), 'Xin chào cả lớp'));
    await waitFor(() => expect(screen.queryByLabelText('Nội dung đang sửa')).toBeNull());
  });

  it('Esc hủy, không gọi server; nội dung không đổi thì cũng không gọi', () => {
    show(msg());
    fireEvent.click(btn('Sửa tin nhắn'));
    const box = screen.getByLabelText('Nội dung đang sửa');
    fireEvent.change(box, { target: { value: 'đang gõ dở' } });
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(screen.queryByLabelText('Nội dung đang sửa')).toBeNull();
    expect(svc.edit).not.toHaveBeenCalled();

    fireEvent.click(btn('Sửa tin nhắn'));
    fireEvent.keyDown(screen.getByLabelText('Nội dung đang sửa'), { key: 'Enter' });
    expect(svc.edit).not.toHaveBeenCalled();
  });

  it('nội dung rỗng bị chặn ngay ở client', () => {
    show(msg());
    fireEvent.click(btn('Sửa tin nhắn'));
    const box = screen.getByLabelText('Nội dung đang sửa');
    fireEvent.change(box, { target: { value: '   ' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(screen.getByText('Nội dung không được để trống')).toBeTruthy();
    expect(svc.edit).not.toHaveBeenCalled();
  });

  it('lỗi từ server hiện ngay dưới ô sửa', async () => {
    svc.edit.mockRejectedValueOnce(new Error('Chỉ người gửi mới được sửa.'));
    show(msg());
    fireEvent.click(btn('Sửa tin nhắn'));
    const box = screen.getByLabelText('Nội dung đang sửa');
    fireEvent.change(box, { target: { value: 'mới' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(await screen.findByText('Chỉ người gửi mới được sửa.')).toBeTruthy();
  });

  it('tin đã sửa có nhãn "(đã chỉnh sửa)"', () => {
    show(msg({ editedAt: '2026-10-21T10:05:00Z' }));
    expect(screen.getByText('(đã chỉnh sửa)')).toBeTruthy();
  });
});

describe('tin nhắn: xóa, ghim, cảm xúc', () => {
  it('Xóa phải xác nhận trong hộp thoại rồi mới gọi', async () => {
    show(msg());
    fireEvent.click(btn('Xóa tin nhắn'));
    expect(svc.remove).not.toHaveBeenCalled();
    expect(screen.getByText('Xóa tin nhắn?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Xóa' }));
    await waitFor(() => expect(svc.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' })));
  });

  it('Hủy trong hộp thoại thì không xóa', () => {
    show(msg());
    fireEvent.click(btn('Xóa tin nhắn'));
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(svc.remove).not.toHaveBeenCalled();
  });

  it('Ghim / Bỏ ghim đổi theo trạng thái hiện tại', () => {
    const { unmount } = show(msg({ author: author('other', 'X') }), leader);
    fireEvent.click(btn('Ghim tin nhắn'));
    expect(svc.setPinned).toHaveBeenCalledWith(expect.anything(), true);
    unmount();
    show(msg({ author: author('other', 'X'), pinned: true }), leader);
    expect(screen.getByText('Đã ghim')).toBeTruthy();
    fireEvent.click(btn('Bỏ ghim'));
    expect(svc.setPinned).toHaveBeenLastCalledWith(expect.anything(), false);
  });

  it('chọn cảm xúc từ bảng chọn nhanh', () => {
    show(msg());
    fireEvent.click(btn('Thả cảm xúc'));
    fireEvent.click(screen.getByRole('button', { name: 'Thả 🎉' }));
    expect(svc.react).toHaveBeenCalledWith(expect.anything(), '🎉');
  });

  it('hiện số người đã thả, đánh dấu cái mình đã thả, bấm để gỡ', () => {
    show(msg({ reactions: [{ emoji: '👍', count: 2, userIds: ['me', 'u2'] }, { emoji: '❤️', count: 1, userIds: ['u3'] }] }));
    const mine = screen.getByRole('button', { name: '👍 2, bạn đã thả' });
    expect(mine.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '❤️ 1' }).getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(mine);
    expect(svc.react).toHaveBeenCalledWith(expect.anything(), '👍');
  });

  it('lỗi khi thả cảm xúc được báo bằng toast', async () => {
    svc.react.mockRejectedValueOnce(new Error('Emoji không hợp lệ.'));
    show(msg());
    fireEvent.click(btn('Thả cảm xúc'));
    fireEvent.click(screen.getByRole('button', { name: 'Thả 👍' }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith('Emoji không hợp lệ.'));
  });
});
