import { create } from 'zustand';
import type { DirectChat } from '../domain/models';

interface DirectState {
  meId: string | null;
  chats: DirectChat[];
  loaded: boolean;
  /** Cuộc trò chuyện đang mở. */
  activeId: string | null;
}

const initial: DirectState = { meId: null, chats: [], loaded: false, activeId: null };

export const useDirectStore = create<DirectState>(() => ({ ...initial }));
export const resetDirectStore = () => useDirectStore.setState({ ...initial });

/** Số cuộc trò chuyện có tin chưa đọc. */
export const selectUnreadChats = (s: DirectState) => s.chats.filter((c) => c.hasUnread).length;
