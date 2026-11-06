import { create } from 'zustand';
import { DEFAULT_SUMMARY_SCOPE, type Summary, type SummaryScope } from '../domain/models';

interface AiState {
  panelOpen: boolean;
  channelId: string | null;
  scope: SummaryScope;
  prompt: string | null;
  status: 'idle' | 'loading' | 'done' | 'error';
  summary: Summary | null;
  error: string | null;
}

const initial: AiState = {
  panelOpen: false,
  channelId: null,
  scope: DEFAULT_SUMMARY_SCOPE,
  prompt: null,
  status: 'idle',
  summary: null,
  error: null,
};

export const useAiStore = create<AiState>(() => ({ ...initial }));

export const resetAiStore = () => useAiStore.setState({ ...initial });
