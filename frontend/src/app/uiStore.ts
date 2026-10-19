import { create } from 'zustand';

/** Trạng thái giao diện thuần (không thuộc nghiệp vụ module nào). */
interface UiState {
  sidebarOpen: boolean;
  membersOpen: boolean;
}

export const useUiStore = create<UiState>(() => ({ sidebarOpen: false, membersOpen: true }));
