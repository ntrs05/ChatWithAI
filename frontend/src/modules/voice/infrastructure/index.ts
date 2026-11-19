import type { VoicePresenceRepository } from '../application/ports';
import { HttpVoicePresenceRepository, registerVoiceWire } from './VoicePresenceRepositories';

export { WebRtcMesh } from './WebRtcMesh';
export { AdaptiveMesh } from './LiveKitMesh';
export { BrowserMicrophone, WebAudioLevelMeter } from './browserAudio';
export { BrowserAudioDevices } from './audioDevices';

export function createVoicePresenceRepository(): VoicePresenceRepository {
  registerVoiceWire();
  return new HttpVoicePresenceRepository();
}
