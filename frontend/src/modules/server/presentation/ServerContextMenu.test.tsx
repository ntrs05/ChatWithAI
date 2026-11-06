// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetServerStore, useServerStore } from '../application/serverStore';
import type { Server } from '../domain/models';
import { muteUntil } from '../domain/rules';
import { ServerContextMenu } from './ServerContextMenu';

const calls = vi.hoisted(() => ({
  markServerRead: vi.fn(),
  muteServer: vi.fn(() => Promise.resolve()),
  unmuteServer: vi.fn(() => Promise.resolve()),
  setNotifyLevel: vi.fn(() => Promise.resolve()),
}));
vi.mock('../module', () => ({ serverService: () => calls }));

const server: Server = { id: 's1', name: 'Lớp KTPM', iconUrl: '', description: '', ownerId: 'u0', inviteCode: 'ABC12345', isPublic: false, createdAt: '' };

beforeEach(() => {
  resetServerStore();
  Object.values(calls).forEach((f) => f.mockClear());
});
afterEach(cleanup);

const open = (props: Partial<Parameters<typeof ServerContextMenu>[0]> = {}) =>
  render(<ServerContextMenu server={server} x={20} y={20} onClose={() => {}} onInvite={() => {}} onLeave={() => {}} {...props} />);

describe('menu chuột phải vào server', () => {
  it('có đủ 5 chức năng như Discord', () => {
    open();
    for (const label of ['Đánh dấu đã đọc', 'Mời vào máy chủ', 'Tắt âm máy chủ', 'Cài đặt thông báo', 'Rời khỏi máy chủ']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('"Đánh dấu đã đọc" bị khóa khi không có tin chưa đọc, mở khóa khi có', () => {
    const { unmount } = open();
    fireEvent.click(screen.getByText('Đánh dấu đã đọc'));
    expect(calls.markServerRead).not.toHaveBeenCalled();
    unmount();

    useServerStore.setState({ unread: { c1: { serverId: 's1', count: 3 } } });
    open();
    fireEvent.click(screen.getByText('Đánh dấu đã đọc'));
    expect(calls.markServerRead).toHaveBeenCalledWith('s1');
  });

  it('"Mời" và "Rời" gọi đúng callback', () => {
    const onInvite = vi.fn();
    const onLeave = vi.fn();
    open({ onInvite, onLeave });
    fireEvent.click(screen.getByText('Mời vào máy chủ'));
    expect(onInvite).toHaveBeenCalled();
    cleanup();
    open({ onInvite, onLeave });
    fireEvent.click(screen.getByText('Rời khỏi máy chủ'));
    expect(onLeave).toHaveBeenCalled();
  });

  it('tắt âm: chọn thời lượng ở menu con', async () => {
    open();
    fireEvent.mouseEnter(screen.getByText('Tắt âm máy chủ'));
    fireEvent.click(screen.getByText('Trong 1 giờ'));
    await waitFor(() => expect(calls.muteServer).toHaveBeenCalledWith('s1', 60));
  });

  it('đang tắt âm thì hiện "Bật âm máy chủ" và bấm sẽ bật lại', async () => {
    useServerStore.setState({ settings: { s1: { level: 'all', mutedUntil: muteUntil('forever') } } });
    open();
    expect(screen.queryByText('Tắt âm máy chủ')).toBeNull();
    expect(screen.getByText(/cho đến khi bạn bật lại/)).toBeTruthy();
    fireEvent.click(screen.getByText('Bật âm máy chủ'));
    await waitFor(() => expect(calls.unmuteServer).toHaveBeenCalledWith('s1'));
  });

  it('cài đặt thông báo: hiện mức hiện tại, chọn mức khác', async () => {
    useServerStore.setState({ settings: { s1: { level: 'mentions', mutedUntil: null } } });
    open();
    expect(screen.getByText('Chỉ @mentions')).toBeTruthy(); // hint dưới nhãn
    fireEvent.mouseEnter(screen.getByText('Cài đặt thông báo'));
    fireEvent.click(screen.getByText('Không có gì'));
    await waitFor(() => expect(calls.setNotifyLevel).toHaveBeenCalledWith('s1', 'nothing'));
  });
});
