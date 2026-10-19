/**
 * PUBLIC API của module Voice (UC07 — Tham gia / Rời kênh Voice, UC08 — Bật / Tắt Micro).
 */
import './events';

export { initVoiceModule, voiceService } from './module';
export { useVoiceStore } from './application/voiceStore';
export type { VoiceParticipant } from './domain/models';
export {
  VoiceChannelParticipants,
  VoiceControls,
  VoiceStatusPanel,
  VoiceAudioSink,
} from './presentation/VoiceWidgets';
export { VoiceRoomView } from './presentation/VoiceRoomView';
