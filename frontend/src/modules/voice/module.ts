import { config } from '@/shared/config';
import type { AppEventBus } from '@/shared/event-bus';
import { clientId } from '@/shared/lib';
import { topics, type RealtimeHub } from '@/shared/realtime';
import { VoiceService } from './application/VoiceService';
import { BrowserAudioDevices, AdaptiveMesh, BrowserMicrophone, WebAudioLevelMeter, WebRtcMesh, createVoicePresenceRepository } from './infrastructure';

let instance: VoiceService | null = null;
const devices = new BrowserAudioDevices();

/** Chọn thiết bị + kiểm tra micro/loa (dùng trong Cài đặt → Giọng nói). */
export const audioDevices = () => devices;

export function initVoiceModule(deps: { bus: AppEventBus; hub: RealtimeHub }): VoiceService {
  // Ưu tiên SFU (LiveKit) cho phòng đông; server chưa bật thì dùng mesh WebRTC. Tín hiệu mesh được PUBLISH lên topic voice:<channelId>.
  const mesh = new AdaptiveMesh(
    clientId,
    new WebRtcMesh(clientId, (env) => deps.hub.publish(topics.voice(env.channelId), 'voice.signal', env), config.iceServers),
  );
  instance = new VoiceService(
    createVoicePresenceRepository(),
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
