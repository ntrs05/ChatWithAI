// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetServerStore, useServerStore } from '../application/serverStore';
import type { Server } from '../domain/models';
import { muteUntil } from '../domain/rules';
import { ServerRail } from './ServerRail';

const svc = vi.hoisted(() => ({
  leaveServer: vi.fn(() => Promise.resolve()),
  markServerRead: vi.fn(),
  muteServer: vi.fn(() => Promise.resolve()),
  unmuteServer: vi.fn(() => Promise.resolve()),
  setNotifyLevel: vi.fn(() => Promise.resolve()),
}));
vi.mock('../module', () => ({ serverService: () => svc }));

const server: Server = { id: 's1', name: 'Lớp KTPM', iconUrl: '/x.png', description: '', ownerId: 'u0', inviteCode: 'ABC12345', isPublic: false, createdAt: '' };

beforeEach(() => {
  resetServerStore();
  useServerStore.setState({ servers: [server], meId: 'me', members: { s1: [{ serverId: 's1', role: 'member', joinedAt: '', user: { id: 'me', displayName: 'Tôi', username: 'me', avatarUrl: '' } }] } });
  Object.values(svc).forEach((f) => f.mockClear());
});
afterEach(cleanup);

const renderRail = () =>
  render(
    <MemoryRouter>
      <ServerRail view="home" renderInviteExtra={() => <div>DANH-SÁCH-BẠN-BÈ</div>} />
    </MemoryRouter>,
  );
const rightClickServer = (name = 'Lớp KTPM') => fireEvent.contextMenu(screen.getByRole('button', { name }), { clientX: 90, clientY: 120 });

describe('thanh server (rail): chuột phải', () => {
  it('chuột phải vào server mở menu; chuột trái vẫn là điều hướng, không mở menu', () => {
    renderRail();
    expect(screen.queryByRole('menu')).toBeNull();
    rightClickServer();
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByText('Mời vào máy chủ')).toBeTruthy();
  });

  it('"Mời vào máy chủ" mở hộp thoại có danh sách bạn bè (slot) + mã mời, và vẫn mở sau khi menu đóng', () => {
    renderRail();
    rightClickServer();
    fireEvent.click(screen.getByText('Mời vào máy chủ'));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByText('Mời bạn bè vào Lớp KTPM')).toBeTruthy();
    expect(screen.getByText('DANH-SÁCH-BẠN-BÈ')).toBeTruthy();
    expect(screen.getByText('ABC12345')).toBeTruthy();
  });

  it('"Rời khỏi máy chủ" hỏi xác nhận rồi mới rời', async () => {
    renderRail();
    rightClickServer();
    fireEvent.click(screen.getByText('Rời khỏi máy chủ'));
    expect(svc.leaveServer).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Rời server'));
    await waitFor(() => expect(svc.leaveServer).toHaveBeenCalledWith('s1'));
  });

  it('chủ server không có nút Rời, chỉ có lời giải thích', () => {
    useServerStore.setState({ members: { s1: [{ serverId: 's1', role: 'owner', joinedAt: '', user: { id: 'me', displayName: 'Tôi', username: 'me', avatarUrl: '' } }] } });
    renderRail();
    rightClickServer();
    fireEvent.click(screen.getByText('Rời khỏi máy chủ'));
    expect(screen.queryByText('Rời server')).toBeNull();
    expect(screen.getByText(/giao quyền chủ server/)).toBeTruthy();
  });

  it('"Đánh dấu đã đọc" xóa số chưa đọc trên server', () => {
    useServerStore.setState({ unread: { c1: { serverId: 's1', count: 4 } } });
    renderRail();
    expect(screen.getByText('4')).toBeTruthy(); // huy hiệu chưa đọc
    rightClickServer();
    fireEvent.click(screen.getByText('Đánh dấu đã đọc'));
    expect(svc.markServerRead).toHaveBeenCalledWith('s1');
  });

  it('server đang tắt âm có nhãn riêng để người dùng nhận ra', () => {
    useServerStore.setState({ settings: { s1: { level: 'all', mutedUntil: muteUntil('forever') } } });
    renderRail();
    expect(screen.getByRole('button', { name: 'Lớp KTPM (đã tắt âm)' })).toBeTruthy();
  });
});
