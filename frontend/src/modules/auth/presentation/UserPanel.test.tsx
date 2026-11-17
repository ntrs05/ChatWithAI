// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsModal } from '@/shared/ui';
import { useAuthStore } from '../application/authStore';
import type { User } from '../domain/User';
import { UserPanel } from './UserPanel';

vi.mock('../module', () => ({ authService: () => ({ logout: vi.fn() }) }));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/shared/event-bus', () => ({ toast: toasts }));

const me: User = {
  id: 'u1', email: 'an@x.vn', displayName: 'Nguyễn An', username: 'an', avatarUrl: '', createdAt: '', userCode: '0042', bio: '', hasPassword: true,
  isAdmin: false,
};

const writeText = vi.fn(() => Promise.resolve());
beforeEach(() => {
  useAuthStore.setState({ user: me, status: 'authenticated', token: 't' });
  Object.assign(navigator, { clipboard: { writeText } });
  writeText.mockClear();
  Object.values(toasts).forEach((f) => f.mockClear());
});
afterEach(cleanup);

const renderPanel = () =>
  render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route path="/app" element={<UserPanel />} />
      </Routes>
    </MemoryRouter>,
  );

describe('thẻ người dùng góc dưới bên trái', () => {
  it('chưa rê chuột thì không hiện thẻ; rê chuột lên ảnh/tên của mình thì hiện TÊN và ID', () => {
    renderPanel();
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.mouseEnter(screen.getByRole('button', { name: /Bấm để sao chép ID/ }).parentElement!);
    const tip = screen.getByRole('tooltip');
    expect(tip.textContent).toContain('Nguyễn An');
    expect(tip.textContent).toContain('#0042');
    fireEvent.mouseLeave(screen.getByRole('button', { name: /Bấm để sao chép ID/ }).parentElement!);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('bấm vào ảnh/tên thì chép ID (4 chữ số, giữ số 0 đầu) và báo', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Bấm để sao chép ID/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('0042'));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith('Đã sao chép ID'));
  });

  it('nút bánh răng mở popup Cài đặt', () => {
    useSettingsModal.getState().hide();
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Cài đặt người dùng' }));
    expect(useSettingsModal.getState().open).toBe(true);
  });
});
