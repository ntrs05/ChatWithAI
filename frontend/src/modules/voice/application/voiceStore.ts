import { create } from 'zustand';
import { clientId } from '@/shared/lib';
import type { UserProfile } from '@/shared/types';
import type { VoiceChannelRef, VoiceParticipant, VoiceStatus } from '../domain/models';

interface VoiceState {
  me: UserProfile | null;
  clientId: string;
  status: VoiceStatus;
  channel: VoiceChannelRef | null;
  muted: boolean;
  deafened: boolean;
  micError: string | null;
  /** channelId → người đang ở trong kênh */
  participants: Record<string, VoiceParticipant[]>;
  remoteStreams: Record<string, MediaStream>;
  speaking: Record<string, boolean>;
}

const initial = (): VoiceState => ({
  me: null,
  clientId,
  status: 'idle',
  channel: null,
  muted: false,
  deafened: false,
  micError: null,
  participants: {},
  remoteStreams: {},
  speaking: {},
});

export const useVoiceStore = create<VoiceState>(initial);

export const resetVoiceStore = () => useVoiceStore.setState(initial());

export function upsertParticipant(p: VoiceParticipant) {
  useVoiceStore.setState((s) => {
    // Một client chỉ ở một kênh: gỡ khỏi kênh cũ nếu có
    const next: Record<string, VoiceParticipant[]> = {};
    for (const [cid, list] of Object.entries(s.participants)) {
      next[cid] = list.filter((x) => x.clientId !== p.clientId);
    }
    next[p.channelId] = [...(next[p.channelId] ?? []), p].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
    return { participants: next };
  });
}

export function removeParticipant(channelId: string, clientId: string) {
  useVoiceStore.setState((s) => ({
    participants: { ...s.participants, [channelId]: (s.participants[channelId] ?? []).filter((x) => x.clientId !== clientId) },
  }));
}
