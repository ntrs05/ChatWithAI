// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetFriendStore, useFriendStore } from '../application/friendStore';
import type { Friend, FriendRequest, FriendUser } from '../domain/models';
import { FriendsView } from './FriendsView';

const svc = vi.hoisted(() => ({
  accept: vi.fn(() => Promise.resolve()),
  declineOrCancel: vi.fn(() => Promise.resolve()),
  remove: vi.fn(() => Promise.resolve()),
  sendRequestByTag: vi.fn((_input: { displayName: string; userCode: string }) => Promise.resolve()),
}));
vi.mock('../module', () => ({ friendService: () => svc }));

const user = (id: string, name: string, status = 'Offline'): FriendUser => ({ id, displayName: name, username: id, avatarUrl: '', status });
const friend = (u: FriendUser): Friend => ({ id: `f-${u.id}`, user: u, since: '' });
const request = (u: FriendUser): FriendRequest => ({ id: `r-${u.id}`, user: u, createdAt: '' });

beforeEach(() => {
  resetFriendStore();
  Object.values(svc).forEach((f) => f.mockClear());
});
afterEach(cleanup);

describe('trang Bạn bè', () => {
  it('tab Tất cả: liệt kê bạn, online trước; rỗng thì gợi ý thêm bạn', () => {
    useFriendStore.setState({ loaded: true });
    const { unmount } = render(<FriendsView />);
    expect(screen.getByText('Chưa có bạn bè nào')).toBeTruthy();
    unmount();

    useFriendStore.setState({ friends: [friend(user('a', 'An')), friend(user('b', 'Bình', 'Online'))] });
    render(<FriendsView />);
    const names = screen.getAllByText(/^(An|Bình)$/).map((n) => n.textContent);
    expect(names).toEqual(['Bình', 'An']);
    expect(screen.getByText(/Trực tuyến 1/)).toBeTruthy();
  });

  it('tab Đang chờ có huy hiệu số lời mời đến, chấp nhận / từ chối / hủy gọi đúng service', async () => {
    const inc = request(user('b', 'Bình'));
    const out = request(user('c', 'Chi'));
    useFriendStore.setState({ loaded: true, incoming: [inc], outgoing: [out] });
    render(<FriendsView />);
    fireEvent.click(screen.getByRole('button', { name: /Đang chờ/ }));
    expect(screen.getByText('Muốn kết bạn với bạn')).toBeTruthy();
    const reject = () => screen.getByRole('button', { name: 'Từ chối' }) as HTMLButtonElement;
    fireEvent.click(screen.getByText('Chấp nhận'));
    expect(svc.accept).toHaveBeenCalledWith(inc);
    expect(reject().disabled).toBe(true); // đang xử lý thì khóa các nút của dòng đó
    await waitFor(() => expect(reject().disabled).toBe(false));
    fireEvent.click(reject());
    expect(svc.declineOrCancel).toHaveBeenCalledWith(inc);
    await waitFor(() => expect(reject().disabled).toBe(false));
    fireEvent.click(screen.getByText('Hủy lời mời'));
    expect(svc.declineOrCancel).toHaveBeenCalledWith(out);
  });

  it('hủy kết bạn phải xác nhận trước', () => {
    const f = friend(user('a', 'An'));
    useFriendStore.setState({ loaded: true, friends: [f] });
    render(<FriendsView />);
    fireEvent.click(screen.getByRole('button', { name: 'Hủy kết bạn' }));
    expect(svc.remove).not.toHaveBeenCalled();
    expect(screen.getByText('Hủy kết bạn?')).toBeTruthy();
    fireEvent.click(screen.getAllByText('Hủy kết bạn').find((el) => el.tagName === 'BUTTON' && el.className.includes('bg-rose'))!);
    expect(svc.remove).toHaveBeenCalledWith(f);
  });

  it('tab Thêm bạn: phải nhập cả tên lẫn ID; thiếu thì báo lỗi và KHÔNG gọi server', async () => {
    useFriendStore.setState({ loaded: true, meId: 'me' });
    render(<FriendsView selfCard={<div>THẺ-TÊN-VÀ-ID</div>} />);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm bạn' }));
    expect(screen.getByText('THẺ-TÊN-VÀ-ID')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Ví dụ: Hoàng Nam'), { target: { value: 'Tuấn' } });
    fireEvent.change(screen.getByPlaceholderText('0042'), { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi lời mời kết bạn/ }));
    expect(screen.getByText('ID là số từ 0 đến 9999')).toBeTruthy();
    expect(svc.sendRequestByTag).not.toHaveBeenCalled();
  });

  it('tab Thêm bạn: đủ tên + ID thì gửi, rồi xóa form', async () => {
    useFriendStore.setState({ loaded: true, meId: 'me' });
    render(<FriendsView />);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm bạn' }));
    const name = screen.getByPlaceholderText('Ví dụ: Hoàng Nam') as HTMLInputElement;
    const code = screen.getByPlaceholderText('0042') as HTMLInputElement;
    fireEvent.change(name, { target: { value: 'Tuấn' } });
    fireEvent.change(code, { target: { value: '#42' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi lời mời kết bạn/ }));
    await waitFor(() => expect(svc.sendRequestByTag).toHaveBeenCalledWith({ displayName: 'Tuấn', userCode: '#42' }));
    await waitFor(() => expect(name.value).toBe(''));
  });

  it('tab Thêm bạn: lỗi từ server (sai tên hoặc ID) được hiển thị', async () => {
    svc.sendRequestByTag.mockRejectedValueOnce(new Error('Không tìm thấy ai khớp cả tên và ID.'));
    useFriendStore.setState({ loaded: true, meId: 'me' });
    render(<FriendsView />);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm bạn' }));
    fireEvent.change(screen.getByPlaceholderText('Ví dụ: Hoàng Nam'), { target: { value: 'Ai đó' } });
    fireEvent.change(screen.getByPlaceholderText('0042'), { target: { value: '1111' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi lời mời kết bạn/ }));
    expect(await screen.findByText(/Không tìm thấy ai khớp cả tên và ID/)).toBeTruthy();
  });

  it('slot hành động hiện cạnh mỗi người bạn (nút Nhắn tin do module khác cấp)', () => {
    useFriendStore.setState({ loaded: true, friends: [friend(user('a', 'An'))] });
    render(<FriendsView renderFriendActions={(f) => <button>Nhắn tin {f.user.displayName}</button>} />);
    expect(screen.getByText('Nhắn tin An')).toBeTruthy();
  });
});
