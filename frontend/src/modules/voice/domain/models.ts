import type { UserProfile } from '@/shared/types';
export interface VoiceParticipant {
  channelId: string;
  serverId: string;
  user: UserProfile;
  clientId: string;
  muted: boolean;
  deafened: boolean;
  joinedAt: string;
}

export type VoiceStatus = 'idle' | 'connecting' | 'connected';

export interface VoiceChannelRef {
  id: string;
  serverId: string;
  name: string;
}

export type SignalData =
  | { kind: 'hello' }
  | { kind: 'offer'; sdp: RTCSessionDescriptionInit }
  | { kind: 'answer'; sdp: RTCSessionDescriptionInit }
  | { kind: 'ice'; candidate: RTCIceCandidateInit }
  | { kind: 'bye' };

export interface SignalEnvelope {
  channelId: string;
  from: string;
  to?: string;
  data: SignalData;
}

// TODO: isInitiator, SPEAKING_THRESHOLD
