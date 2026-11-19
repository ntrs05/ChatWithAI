// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVoiceSettings } from '../application/voiceSettings';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';

const dev = vi.hoisted(() => {
  const stop = vi.fn();
  let finish: () => void = () => {};
  return {
    stop,
    finishPlayback: () => finish(),
    api: {
      supportsSpeakerSelect: () => true,
      supportsRecording: () => true,
      requestPermission: vi.fn(() => Promise.resolve(true)),
      list: vi.fn(() =>
        Promise.resolve({
          mics: [
            { id: 'm1', label: 'Micro USB' },
            { id: 'm2', label: 'Micro laptop' },
          ],
          speakers: [{ id: 's1', label: 'Tai nghe' }],
        }),
      ),
      startMicTest: vi.fn((_id: string, _cb: (l: number) => void) =>
        Promise.resolve({ stop: () => Promise.resolve(new Blob(['x'], { type: 'audio/webm' })) }),
      ),
      play: vi.fn((_b: Blob, _s: string, _v: number) =>
        Promise.resolve({ ended: new Promise<void>((r) => (finish = r)), stop }),
      ),
      playTone: vi.fn(() => Promise.resolve()),
    },
  };
});
vi.mock('../module', () => ({ audioDevices: () => dev.api }));

beforeEach(() => {
  localStorage.clear();
  useVoiceSettings.setState({ micId: '', speakerId: '', speakerVolume: 100 });
  Object.values(dev.api).forEach((f) => typeof f === 'function' && 'mockClear' in f && (f as ReturnType<typeof vi.fn>).mockClear());
});
afterEach(cleanup);

describe('Cài đặt → Giọng nói & Video', () => {
  it('liệt kê micro và loa; chọn micro thì lưu lại', async () => {
    render(<VoiceSettingsPanel />);
    await screen.findByRole('option', { name: 'Micro USB' });
    fireEvent.change(screen.getByLabelText('Micro'), { target: { value: 'm2' } });
    expect(useVoiceSettings.getState().micId).toBe('m2');
    expect(JSON.parse(localStorage.getItem('nebula.voice.settings')!).micId).toBe('m2');
  });

  it('kiểm tra mic: ghi bằng micro đã chọn → dừng → PHÁT LẠI bản ghi qua loa đã chọn', async () => {
    useVoiceSettings.setState({ micId: 'm2', speakerId: 's1', speakerVolume: 60 });
    render(<VoiceSettingsPanel />);
    await screen.findByRole('option', { name: 'Micro USB' });

    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra mic/ }));
    await screen.findByText(/Đang ghi/);
    expect(dev.api.startMicTest).toHaveBeenCalledWith('m2', expect.any(Function));

    fireEvent.click(screen.getByRole('button', { name: /Dừng/ }));
    await screen.findByText(/Đang phát lại giọng của bạn/);
    expect(dev.api.play).toHaveBeenCalledWith(expect.any(Blob), 's1', 60);

    await act(async () => dev.finishPlayback());
    await waitFor(() => expect(screen.getByRole('button', { name: /Kiểm tra mic/ })).toBeTruthy());
  });

  it('micro bị chặn thì báo cách bật, không bị treo', async () => {
    dev.api.startMicTest.mockRejectedValueOnce(new DOMException('no', 'NotAllowedError'));
    render(<VoiceSettingsPanel />);
    fireEvent.click(await screen.findByRole('button', { name: /Kiểm tra mic/ }));
    await screen.findByText(/đang chặn micro/);
    expect(screen.getByRole('button', { name: /Kiểm tra mic/ })).toBeTruthy();
  });

  it('kéo âm lượng loa thì lưu; nút Phát âm thử gọi playTone', async () => {
    render(<VoiceSettingsPanel />);
    await screen.findByRole('option', { name: 'Micro USB' });
    fireEvent.change(screen.getByLabelText('Âm lượng loa'), { target: { value: '40' } });
    expect(useVoiceSettings.getState().speakerVolume).toBe(40);
    fireEvent.click(screen.getByRole('button', { name: /Phát âm thử/ }));
    await waitFor(() => expect(dev.api.playTone).toHaveBeenCalledWith('', 40));
  });
});
