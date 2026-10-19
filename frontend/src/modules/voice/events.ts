import type { SignalEnvelope, VoiceParticipant } from './domain/models';

/** Sự kiện của module Voice. */
declare module '@/shared/event-bus/events' {
  interface AppEvents {
    /** (Realtime) Ai đó vào kênh thoại. */
    'voice.participant.joined': { participant: VoiceParticipant };
    /** (Realtime) Ai đó rời kênh thoại. */
    'voice.participant.left': { channelId: string; serverId: string; clientId: string };
    /** (Realtime) Ai đó bật/tắt micro hoặc loa. */
    'voice.participant.updated': { participant: VoiceParticipant };
    /** (Realtime, tạm thời) Tín hiệu WebRTC offer/answer/ICE. */
    'voice.signal': SignalEnvelope;
  }
}

export {};
