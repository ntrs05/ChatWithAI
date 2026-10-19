import type { SignalEnvelope, VoiceParticipant } from '../domain/models';

/** Trạng thái "ai đang ở kênh thoại nào" lưu ở server. */
export interface VoicePresenceRepository {
  listByServer(serverId: string): Promise<VoiceParticipant[]>;
  join(channelId: string, state: { clientId: string; muted: boolean; deafened: boolean }): Promise<VoiceParticipant>;
  /** Phải bắt đầu gửi đồng bộ — được gọi cả trong `beforeunload`. */
  leave(channelId: string, clientId: string): Promise<void>;
  update(channelId: string, clientId: string, patch: { muted: boolean; deafened: boolean }): Promise<void>;
  heartbeat(channelId: string, clientId: string): Promise<void>;
}

export interface MicrophonePort {
  getMicrophone(): Promise<MediaStream>;
}

/** Lưới kết nối WebRTC (mesh) giữa các thành viên trong kênh. */
export interface PeerMesh {
  join(channelId: string, local: MediaStream | null): void;
  leave(): void;
  handleSignal(envelope: SignalEnvelope): void;
  onRemoteStream(handler: (clientId: string, stream: MediaStream | null) => void): void;
}

/** Đo âm lượng để hiển thị "đang nói". */
export interface AudioLevelMeter {
  watch(id: string, stream: MediaStream, onSpeaking: (speaking: boolean) => void): void;
  unwatch(id: string): void;
  unwatchAll(): void;
}
