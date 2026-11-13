import { create } from 'zustand';

interface SettingsModalState {
  open: boolean;
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
