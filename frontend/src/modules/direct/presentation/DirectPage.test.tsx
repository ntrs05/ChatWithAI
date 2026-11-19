// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDirectStore, useDirectStore } from '../application/directStore';
import type { DirectChat } from '../domain/models';
import { DirectPage } from './DirectPage';

const setActive = vi.hoisted(() => vi.fn());
vi.mock('../module', () => ({ directService: () => ({ setActive, open: vi.fn() }) }));
// ChatView thật kéo theo cả module chat; ở đây chỉ cần biết DirectPage truyền đúng props xuống.
vi.mock('@/modules/chat', () => ({
  ChatView: (p: { variant?: string; disabledReason?: string; channel: { id: string; name: string; serverId: string } }) => (
    <div>
      CHAT[{p.variant}|{p.channel.name}|{p.channel.id}|server={p.channel.serverId || 'none'}]{p.disabledReason ? `|CHẶN:${p.disabledReason}` : ''}
    </div>
  ),
}));

const chat: DirectChat = { id: 'c1', user: { id: 'u2', displayName: 'Minh', username: 'minh', avatarUrl: '' }, lastMessageAt: null, hasUnread: true, isFriend: true };

beforeEach(() => {
  resetDirectStore();
  setActive.mockClear();
});
afterEach(cleanup);

const renderAt = (id: string) =>
  render(
    <MemoryRouter initialEntries={[`/app/dm/${id}`]}>
      <Routes>
        <Route path="/app/dm/:conversationId" element={<DirectPage />} />
        <Route path="/app/friends" element={<div>FRIENDS</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('trang chat 1-1', () => {
  it('đang tải danh sách thì hiện vòng quay', () => {
    useDirectStore.setState({ loaded: false });
    renderAt('c1');
    expect(screen.getByLabelText('Đang tải')).toBeTruthy();
  });

  it('không có cuộc trò chuyện đó → thông báo + link về Bạn bè', () => {
    useDirectStore.setState({ loaded: true, chats: [] });
    renderAt('zzz');
    expect(screen.getByText('Không tìm thấy cuộc trò chuyện')).toBeTruthy();
    expect(screen.getByText('Về danh sách bạn bè')).toBeTruthy();
  });

  it('hiển thị chat bằng ChatView kiểu 1-1 (tên người kia, không thuộc server nào) và đánh dấu đang xem', () => {
    useDirectStore.setState({ loaded: true, chats: [chat] });
    renderAt('c1');
    expect(screen.getByText('CHAT[direct|Minh|c1|server=none]')).toBeTruthy();
    expect(setActive).toHaveBeenCalledWith('c1');
  });

  it('hủy kết bạn: truyền lý do chặn nhắn tin xuống', () => {
    useDirectStore.setState({ loaded: true, chats: [{ ...chat, isFriend: false }] });
    renderAt('c1');
    expect(screen.getByText(/CHẶN:Bạn và Minh không còn là bạn bè/)).toBeTruthy();
  });

  it('rời trang thì bỏ trạng thái đang xem', () => {
    useDirectStore.setState({ loaded: true, chats: [chat] });
    const { unmount } = renderAt('c1');
    unmount();
    expect(setActive).toHaveBeenLastCalledWith(null);
  });
});
