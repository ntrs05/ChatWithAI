import type { ApiMode } from '@/shared/config';
import type { VoicePresenceRepository } from '../application/ports';
import { HttpVoicePresenceRepository, MockVoicePresenceRepository } from './VoicePresenceRepositories';

export { WebRtcMesh } from './WebRtcMesh';
export { BrowserMicrophone, WebAudioLevelMeter } from './browserAudio';

export function createVoicePresenceRepository(mode: ApiMode): VoicePresenceRepository {
  return mode === 'mock' ? new MockVoicePresenceRepository() : new HttpVoicePresenceRepository();
}
