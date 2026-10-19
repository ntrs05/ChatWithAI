import { config, type ApiMode } from '@/shared/config';
import type { AppEventBus } from '@/shared/event-bus';
import { clientId } from '@/shared/lib';
import { topics, type RealtimeHub } from '@/shared/realtime';
import { VoiceService } from './application/VoiceService';
import { BrowserMicrophone, WebAudioLevelMeter, WebRtcMesh, createVoicePresenceRepository } from './infrastructure';

let instance: VoiceService | null = null;

export function initVoiceModule(deps: { bus: AppEventBus; hub: RealtimeHub; mode: ApiMode }): VoiceService {
  // Tín hiệu WebRTC được PUBLISH lên topic voice:<channelId> qua RealtimeHub
  const mesh = new WebRtcMesh(
    clientId,
    (env) => deps.hub.publish(topics.voice(env.channelId), 'voice.signal', env),
    config.iceServers,
  );
  instance = new VoiceService(
    createVoicePresenceRepository(deps.mode),
    new BrowserMicrophone(),
    mesh,
    new WebAudioLevelMeter(),
    deps.bus,
    deps.hub,
  );
  return instance;
}

export function voiceService(): VoiceService {
  if (!instance) throw new Error('Module Voice chưa được khởi tạo');
  return instance;
}
