// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../application/authStore';
import type { User } from '../domain/User';
import { SettingsPage } from './SettingsPage';

const svc = vi.hoisted(() => ({
  changePassword: vi.fn((_i: { currentPassword: string; newPassword: string }) => Promise.resolve()),
  updateProfile: vi.fn((_i: { displayName: string; avatarUrl: string; bio: string }) => Promise.resolve()),
  uploadAvatar: vi.fn((_f: File) => Promise.resolve('/api/avatars/abc')),
  logout: vi.fn(),
}));
vi.mock('../module', () => ({ authService: () => svc }));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/shared/event-bus', () => ({ toast: toasts }));

const me: User = {
  id: 'u1', email: 'an@x.vn', displayName: 'Nguyễn An', username: 'an', avatarUrl: '/avatars/av-01.svg', createdAt: '', userCode: '0042', bio: 'xin chào', hasPassword: true,
  isAdmin: false,
};

beforeEach(() => {
  useAuthStore.setState({ user: me, status: 'authenticated', token: 't' });
  Object.values(svc).forEach((f) => f.mockClear());
  Object.values(toasts).forEach((f) => f.mockClear());
});
afterEach(cleanup);

const passwordFields = () => ({
  current: screen.getByLabelText('Mật khẩu hiện tại'),
  next: screen.getByLabelText('Mật khẩu mới'),
  again: screen.getByLabelText('Nhập lại mật khẩu mới'),
});

describe('Cài đặt → Tài khoản của tôi', () => {
  it('cho người dùng biết TÊN và ID của chính mình (và email)', () => {
    render(<SettingsPage />);
    expect(screen.getAllByText('Nguyễn An').length).toBeGreaterThan(0);
    expect(screen.getByText('#0042')).toBeTruthy();
    expect(screen.getByText('an@x.vn')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Chép ID/ })).toBeTruthy();
  });

  it('đổi mật khẩu: báo lỗi khi sai / thiếu và KHÔNG gọi server', () => {
    render(<SettingsPage />);
    const f = passwordFields();
    fireEvent.change(f.next, { target: { value: '123' } });
    fireEvent.change(f.again, { target: { value: 'khac' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    expect(screen.getByText('Vui lòng nhập mật khẩu hiện tại')).toBeTruthy();
    expect(screen.getByText('Mật khẩu mới tối thiểu 6 ký tự')).toBeTruthy();
    expect(screen.getByText('Mật khẩu nhập lại không khớp')).toBeTruthy();
    expect(svc.changePassword).not.toHaveBeenCalled();
  });

  it('đổi mật khẩu thành công: gọi service, xóa form, báo', async () => {
    render(<SettingsPage />);
    const f = passwordFields();
    fireEvent.change(f.current, { target: { value: 'cu1234' } });
    fireEvent.change(f.next, { target: { value: 'moi1234' } });
    fireEvent.change(f.again, { target: { value: 'moi1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    await waitFor(() => expect(svc.changePassword).toHaveBeenCalledWith({ currentPassword: 'cu1234', newPassword: 'moi1234' }));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith('Đã đổi mật khẩu'));
    expect((f.next as HTMLInputElement).value).toBe('');
  });

  it('mật khẩu hiện tại sai (lỗi từ server) được hiển thị', async () => {
    svc.changePassword.mockRejectedValueOnce(new Error('Mật khẩu hiện tại không đúng.'));
    render(<SettingsPage />);
    const f = passwordFields();
    fireEvent.change(f.current, { target: { value: 'sai' } });
    fireEvent.change(f.next, { target: { value: 'moi1234' } });
    fireEvent.change(f.again, { target: { value: 'moi1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    expect(await screen.findByText('Mật khẩu hiện tại không đúng.')).toBeTruthy();
  });

  it('tài khoản Google chưa có mật khẩu: không hỏi mật khẩu hiện tại, nút là "Đặt mật khẩu"', async () => {
    useAuthStore.setState({ user: { ...me, hasPassword: false } });
    render(<SettingsPage />);
    expect(screen.queryByLabelText('Mật khẩu hiện tại')).toBeNull();
    expect(screen.getByText(/đăng nhập bằng Google và chưa có mật khẩu/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'moi1234' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu mới'), { target: { value: 'moi1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đặt mật khẩu' }));
    await waitFor(() => expect(svc.changePassword).toHaveBeenCalledWith({ currentPassword: '', newPassword: 'moi1234' }));
  });
});

describe('Cài đặt → Hồ sơ', () => {
  const openProfile = () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: /Hồ sơ/ }));
  };

  it('nút Lưu bị khóa cho đến khi có thay đổi; lưu gọi đúng dữ liệu', async () => {
    openProfile();
    const save = screen.getByRole('button', { name: /Lưu thay đổi/ }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'An Mới' } });
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    await waitFor(() => expect(svc.updateProfile).toHaveBeenCalledWith({ displayName: 'An Mới', avatarUrl: '/avatars/av-01.svg', bio: 'xin chào' }));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith('Đã lưu hồ sơ'));
  });

  it('tên quá ngắn bị chặn, không gọi server', () => {
    openProfile();
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/ }));
    expect(screen.getByText('Tên hiển thị dài 2–32 ký tự')).toBeTruthy();
    expect(svc.updateProfile).not.toHaveBeenCalled();
  });

  it('chọn ảnh có sẵn làm thay đổi bản nháp (chưa lưu cho đến khi bấm Lưu)', () => {
    openProfile();
    fireEvent.click(screen.getAllByRole('button', { name: 'Chọn ảnh có sẵn' })[3]);
    expect((screen.getByRole('button', { name: /Lưu thay đổi/ }) as HTMLButtonElement).disabled).toBe(false);
    expect(svc.updateProfile).not.toHaveBeenCalled();
  });

  it('tải ảnh lên: sai định dạng bị chặn ngay ở client; đúng thì gọi upload và dùng URL trả về', async () => {
    openProfile();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.svg', { type: 'image/svg+xml' })] } });
    expect(await screen.findByText(/PNG, JPEG, WebP hoặc GIF/)).toBeTruthy();
    expect(svc.uploadAvatar).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { files: [new File([new Uint8Array(10)], 'a.png', { type: 'image/png' })] } });
    await waitFor(() => expect(svc.uploadAvatar).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole('button', { name: /Lưu thay đổi/ }));
    await waitFor(() => expect(svc.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ avatarUrl: '/api/avatars/abc' })));
  });
});
