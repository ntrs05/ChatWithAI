import { create } from 'zustand';
import type { Message } from '../domain/models';

export interface ChannelHistory {
  messages: Message[];
  hasMore: boolean;
  loading: boolean;
  loaded: boolean;
}

interface ChatState {
  me: { id: string; displayName: string; username: string; avatarUrl: string } | null;
  history: Record<string, ChannelHistory>;
  /** channelId → userId → { tên, hết hạn lúc } */
  typing: Record<string, Record<string, { name: string; until: number }>>;
}

const initial: ChatState = { me: null, history: {}, typing: {} };

export const useChatStore = create<ChatState>(() => ({ ...initial }));

export const resetChatStore = () => useChatStore.setState({ ...initial });

export const emptyHistory: ChannelHistory = { messages: [], hasMore: true, loading: false, loaded: false };

export function patchHistory(channelId: string, patch: (h: ChannelHistory) => Partial<ChannelHistory>) {
  useChatStore.setState((s) => {
    const current = s.history[channelId] ?? emptyHistory;
    return { history: { ...s.history, [channelId]: { ...current, ...patch(current) } } };
  });
}
