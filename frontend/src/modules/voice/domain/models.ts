import type { UserProfile } from '@/shared/types';

export interface VoiceParticipant {
  channelId: string;
  serverId: string;
  user: UserProfile;
  /** Mỗi tab là một "client" riêng → một kết nối WebRTC riêng */
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

/** Tín hiệu WebRTC trao đổi qua server (signaling). Âm thanh đi trực tiếp peer-to-peer. */
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

/**
 * Tránh "glare" (hai bên cùng gửi offer): bên có clientId NHỎ HƠN luôn là bên khởi tạo offer.
 */
export const isInitiator = (selfId: string, peerId: string) => selfId < peerId;

export const SPEAKING_THRESHOLD = 0.04;
