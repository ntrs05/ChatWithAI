import type { SignalEnvelope, VoiceParticipant } from './domain/models';

declare module '@/shared/event-bus/events' {
  interface AppEvents {
    'voice.participant.joined': { participant: VoiceParticipant };
    'voice.participant.left': { channelId: string; serverId: string; clientId: string };
    'voice.participant.updated': { participant: VoiceParticipant };
    'voice.signal': SignalEnvelope;
  }
}

export {};
