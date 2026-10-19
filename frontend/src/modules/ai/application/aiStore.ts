import { create } from 'zustand';
import { DEFAULT_SUMMARY_RANGE, type Summary } from '../domain/models';

interface AiState {
  panelOpen: boolean;
  channelId: string | null;
  limit: number;
  status: 'idle' | 'loading' | 'done' | 'error';
  summary: Summary | null;
  error: string | null;
}

const initial: AiState = {
  panelOpen: false,
  channelId: null,
  limit: DEFAULT_SUMMARY_RANGE,
  status: 'idle',
  summary: null,
  error: null,
};

export const useAiStore = create<AiState>(() => ({ ...initial }));

export const resetAiStore = () => useAiStore.setState({ ...initial });
