// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsModal } from '@/shared/ui';
import { SettingsModal } from './SettingsModal';

vi.mock('@/modules/auth', () => ({
  SettingsPage: ({ onClose }: { onClose?: () => void }) => (
    <div>
      NỘI-DUNG-CÀI-ĐẶT
      <button onClick={onClose} aria-label="Đóng cài đặt">
        x
      </button>
    </div>
  ),
}));
vi.mock('@/modules/voice', () => ({ VoiceSettingsPanel: () => <div>VOICE</div> }));

beforeEach(() => useSettingsModal.getState().hide());
afterEach(cleanup);

describe('Cài đặt dạng popup', () => {
  it('đang đóng thì không hiện gì; mở thì hiện hộp thoại', () => {
    const { unmount } = render(<SettingsModal />);
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();
    useSettingsModal.getState().show();
    render(<SettingsModal />);
    expect(screen.getByRole('dialog', { name: 'Cài đặt' })).toBeTruthy();
  });

  it('bấm ✕ thì đóng', () => {
    useSettingsModal.getState().show();
    render(<SettingsModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng cài đặt' }));
    expect(useSettingsModal.getState().open).toBe(false);
  });

  it('bấm ra ngoài khung thì đóng; bấm trong khung thì không', () => {
    useSettingsModal.getState().show();
    render(<SettingsModal />);
    fireEvent.click(screen.getByText('NỘI-DUNG-CÀI-ĐẶT'));
    expect(useSettingsModal.getState().open).toBe(true);
    fireEvent.click(screen.getByTestId('settings-backdrop'));
    expect(useSettingsModal.getState().open).toBe(false);
  });

  it('nhấn Esc thì đóng', () => {
    useSettingsModal.getState().show();
    render(<SettingsModal />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useSettingsModal.getState().open).toBe(false);
  });
});
