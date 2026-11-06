import { create } from 'zustand';

const KEY = 'nebula.voice.settings';

interface VoiceSettings {
  /** '' = thiết bị mặc định của hệ thống */
  micId: string;
  speakerId: string;
  /** 0–100 */
  speakerVolume: number;
  setMic: (id: string) => void;
  setSpeaker: (id: string) => void;
  setSpeakerVolume: (v: number) => void;
}

function load(): Pick<VoiceSettings, 'micId' | 'speakerId' | 'speakerVolume'> {
  const fallback = { micId: '', speakerId: '', speakerVolume: 100 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<typeof fallback>;
    return {
      micId: typeof p.micId === 'string' ? p.micId : '',
      speakerId: typeof p.speakerId === 'string' ? p.speakerId : '',
      speakerVolume: typeof p.speakerVolume === 'number' ? Math.min(100, Math.max(0, p.speakerVolume)) : 100,
    };
  } catch {
    return fallback;
  }
}

function save(s: Pick<VoiceSettings, 'micId' | 'speakerId' | 'speakerVolume'>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ micId: s.micId, speakerId: s.speakerId, speakerVolume: s.speakerVolume }));
  } catch {
    /* chế độ riêng tư: bỏ qua */
  }
}

/** Lựa chọn thiết bị âm thanh của người dùng (lưu trong trình duyệt, không gửi lên server). */
export const useVoiceSettings = create<VoiceSettings>((set, get) => ({
  ...load(),
  setMic: (micId) => {
    set({ micId });
    save(get());
  },
  setSpeaker: (speakerId) => {
    set({ speakerId });
    save(get());
  },
  setSpeakerVolume: (speakerVolume) => {
    set({ speakerVolume });
    save(get());
  },
}));
