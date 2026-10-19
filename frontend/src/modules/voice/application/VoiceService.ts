import type { AppEventBus } from '@/shared/event-bus';
import { errorMessage } from '@/shared/http';
import { topics, type RealtimeHub } from '@/shared/realtime';
import type { VoiceChannelRef } from '../domain/models';
import type { AudioLevelMeter, MicrophonePort, PeerMesh, VoicePresenceRepository } from './ports';
import { removeParticipant, resetVoiceStore, upsertParticipant, useVoiceStore } from './voiceStore';

const HEARTBEAT_MS = 10_000;

/**
 * UC07 — Tham gia / Rời kênh Voice · UC08 — Bật / Tắt Micro.
 *
 * Luồng tham gia:
 *   1. Xin quyền micro (getUserMedia)
 *   2. Báo server "tôi vào kênh" (presence) → server PUBLISH 'voice.participant.joined'
 *   3. Subscribe topic voice:<channelId> để trao đổi tín hiệu WebRTC
 *   4. Mesh gửi 'hello' → các peer tạo kết nối P2P, âm thanh truyền trực tiếp
 */
export class VoiceService {
  private local: MediaStream | null = null;
  private offTopic: (() => void) | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly presence: VoicePresenceRepository,
    private readonly mic: MicrophonePort,
    private readonly mesh: PeerMesh,
    private readonly meter: AudioLevelMeter,
    private readonly bus: AppEventBus,
    private readonly hub: RealtimeHub,
  ) {
    mesh.onRemoteStream((cid, stream) => {
      useVoiceStore.setState((s) => {
        const remoteStreams = { ...s.remoteStreams };
        if (stream) remoteStreams[cid] = stream;
        else delete remoteStreams[cid];
        return { remoteStreams };
      });
      if (stream) this.meter.watch(cid, stream, (speaking) => this.setSpeaking(cid, speaking));
      else {
        this.meter.unwatch(cid);
        this.setSpeaking(cid, false);
      }
    });

    // ---- SUBSCRIBE ----
    bus.subscribe('auth.loggedIn', ({ user }) => useVoiceStore.setState({ me: user }));
    bus.subscribe('auth.loggingOut', () => void this.leave());
    bus.subscribe('auth.loggedOut', () => resetVoiceStore());
    bus.subscribe('server.listLoaded', ({ serverIds }) => serverIds.forEach((id) => void this.loadServer(id)));
    bus.subscribe('server.joined', ({ server }) => void this.loadServer(server.id));
    // Pub-Sub: module Server không biết gì về Voice — chỉ phát 'channel.selected'
    bus.subscribe('channel.selected', ({ channel }) => {
      if (channel.type === 'voice' && useVoiceStore.getState().channel?.id !== channel.id) {
        void this.join({ id: channel.id, serverId: channel.serverId, name: channel.name });
      }
    });
    bus.subscribe('voice.participant.joined', ({ participant }) => upsertParticipant(participant));
    bus.subscribe('voice.participant.updated', ({ participant }) => upsertParticipant(participant));
    bus.subscribe('voice.participant.left', ({ channelId, clientId }) => removeParticipant(channelId, clientId));
    bus.subscribe('voice.signal', (env) => {
      const s = useVoiceStore.getState();
      if (s.status === 'idle' || env.channelId !== s.channel?.id) return;
      if (env.from === s.clientId || (env.to && env.to !== s.clientId)) return;
      this.mesh.handleSignal(env);
    });

    window.addEventListener('beforeunload', () => {
      const s = useVoiceStore.getState();
      if (s.channel) {
        this.mesh.leave();
        void this.presence.leave(s.channel.id, s.clientId);
      }
    });
  }

  async join(channel: VoiceChannelRef): Promise<void> {
    const state = useVoiceStore.getState();
    if (state.channel?.id === channel.id && state.status !== 'idle') return;
    if (state.channel) await this.leave();

    useVoiceStore.setState({ status: 'connecting', channel, micError: null });
    try {
      this.local = await this.mic.getMicrophone();
    } catch (err) {
      this.local = null;
      useVoiceStore.setState({
        micError: 'Không truy cập được micro — bạn đang ở chế độ chỉ nghe.',
        muted: true,
      });
      console.warn('[voice] getUserMedia lỗi', err);
    }
    // Người dùng có thể đã rời đi trong lúc chờ quyền micro
    if (useVoiceStore.getState().channel?.id !== channel.id) {
      this.stopLocal();
      return;
    }
    this.applyMute();

    try {
      const { clientId, muted, deafened } = useVoiceStore.getState();
      const me = await this.presence.join(channel.id, { clientId, muted, deafened });
      upsertParticipant(me);
      this.offTopic = this.hub.subscribe(topics.voice(channel.id));
      if (this.local) this.meter.watch(clientId, this.local, (sp) => this.setSpeaking(clientId, sp && !useVoiceStore.getState().muted));
      this.mesh.join(channel.id, this.local);
      this.heartbeat = setInterval(() => void this.presence.heartbeat(channel.id, clientId).catch(() => {}), HEARTBEAT_MS);
      useVoiceStore.setState({ status: 'connected' });
    } catch (err) {
      this.cleanup();
      useVoiceStore.setState({ status: 'idle', channel: null });
      this.bus.publish('ui.toast', { kind: 'error', message: errorMessage(err, 'Không vào được kênh thoại') });
    }
  }

  async leave(): Promise<void> {
    const { channel, clientId } = useVoiceStore.getState();
    if (!channel) return;
    this.cleanup();
    removeParticipant(channel.id, clientId);
    useVoiceStore.setState({ status: 'idle', channel: null, remoteStreams: {}, speaking: {} });
    try {
      await this.presence.leave(channel.id, clientId);
    } catch {
      /* server sẽ tự dọn khi mất heartbeat */
    }
  }

  /** UC08 — Bật / Tắt micro. */
  toggleMute(): void {
    const s = useVoiceStore.getState();
    if (s.muted && s.micError && !this.local) {
      this.bus.publish('ui.toast', { kind: 'error', message: 'Chưa có quyền dùng micro. Hãy cho phép trong trình duyệt rồi vào lại kênh.' });
      return;
    }
    const muted = !s.muted;
    // Bật mic khi đang tắt loa → bật luôn loa (giống các ứng dụng gọi thoại phổ biến)
    useVoiceStore.setState({ muted, deafened: muted ? s.deafened : false });
    this.applyMute();
    this.syncState();
  }

  toggleDeafen(): void {
    const s = useVoiceStore.getState();
    const deafened = !s.deafened;
    useVoiceStore.setState({ deafened, muted: deafened ? true : this.local ? false : s.muted });
    this.applyMute();
    this.syncState();
  }

  private async loadServer(serverId: string) {
    try {
      const list = await this.presence.listByServer(serverId);
      list.forEach(upsertParticipant);
    } catch {
      /* không quan trọng */
    }
  }

  private applyMute() {
    const { muted, clientId } = useVoiceStore.getState();
    this.local?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    if (muted) this.setSpeaking(clientId, false);
  }

  private syncState() {
    const s = useVoiceStore.getState();
    if (!s.channel || s.status !== 'connected') return;
    void this.presence.update(s.channel.id, s.clientId, { muted: s.muted, deafened: s.deafened }).catch(() => {});
  }

  private setSpeaking(cid: string, speaking: boolean) {
    if (useVoiceStore.getState().speaking[cid] === speaking) return;
    useVoiceStore.setState((s) => ({ speaking: { ...s.speaking, [cid]: speaking } }));
  }

  private stopLocal() {
    this.local?.getTracks().forEach((t) => t.stop());
    this.local = null;
  }

  private cleanup() {
    this.mesh.leave();
    this.meter.unwatchAll();
    this.stopLocal();
    this.offTopic?.();
    this.offTopic = null;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }
}
