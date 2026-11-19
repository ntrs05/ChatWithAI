import { create } from 'zustand';

/** Trạng thái đóng/mở của cửa sổ Cài đặt (popup phủ lên ứng dụng như Discord). Module nào cũng mở được: `useSettingsModal.getState().show()`. */
interface SettingsModalState {
  open: boolean;
  /** Tab muốn mở sẵn (vd 'voice'). */
  tab: string | null;
  show: (tab?: string) => void;
  hide: () => void;
}

export const useSettingsModal = create<SettingsModalState>((set) => ({
  open: false,
  tab: null,
  show: (tab) => set({ open: true, tab: tab ?? null }),
  hide: () => set({ open: false, tab: null }),
}));
