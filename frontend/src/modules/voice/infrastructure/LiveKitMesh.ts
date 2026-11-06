import { LocalAudioTrack, Room, RoomEvent, Track, type RemoteParticipant, type RemoteTrack } from 'livekit-client';
import { http } from '@/shared/http';
import type { PeerMesh } from '../application/ports';
import type { SignalEnvelope } from '../domain/models';

interface SfuToken {
  url: string;
  token: string;
}

/**
 * Nối vào phòng LiveKit (SFU): mỗi người chỉ gửi MỘT luồng âm thanh lên server, server chia lại cho cả phòng.
 * Danh tính trong phòng = clientId, nên khóa của luồng nghe được khớp với danh sách người trong kênh của VoiceService.
 */
export class LiveKitMesh implements PeerMesh {
  private room: Room | null = null;
  private remoteHandler: (clientId: string, stream: MediaStream | null) => void = () => {};

  onRemoteStream(handler: (clientId: string, stream: MediaStream | null) => void): void {
    this.remoteHandler = handler;
  }

  /** Ném lỗi nếu không nối được (chưa bật LiveKit, sai địa chỉ...) để lớp bọc quay về mesh. */
  async connect(channelId: string, clientId: string, local: MediaStream | null): Promise<void> {
    const { url, token } = await http<SfuToken>(`/channels/${channelId}/voice/token`, { method: 'POST', body: { clientId } });
    const room = new Room({ dynacast: true });
    room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub, p: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) this.remoteHandler(p.identity, new MediaStream([track.mediaStreamTrack]));
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _pub, p: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) this.remoteHandler(p.identity, null);
      })
      .on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => this.remoteHandler(p.identity, null));

    await room.connect(url, token);
    this.room = room;
    const mic = local?.getAudioTracks()[0];
    if (mic) await room.localParticipant.publishTrack(new LocalAudioTrack(mic), { source: Track.Source.Microphone });
  }

  join(): void {
    /* đã nối ở connect() */
  }

  leave(): void {
    void this.room?.disconnect();
    this.room = null;
  }

  handleSignal(_envelope: SignalEnvelope): void {
    /* SFU có đường tín hiệu riêng, không dùng tín hiệu WebRTC qua hub */
  }
}

/**
 * Ưu tiên SFU; nếu server chưa bật LiveKit hoặc nối lỗi thì tự dùng mesh WebRTC cũ, người dùng không thấy khác biệt.
 */
export class AdaptiveMesh implements PeerMesh {
  private active: PeerMesh | null = null;
  private generation = 0;
  private remoteHandler: (clientId: string, stream: MediaStream | null) => void = () => {};

  constructor(
    private readonly selfId: string,
    private readonly mesh: PeerMesh,
    private readonly createSfu: () => LiveKitMesh = () => new LiveKitMesh(),
  ) {}

  onRemoteStream(handler: (clientId: string, stream: MediaStream | null) => void): void {
    this.remoteHandler = handler;
    this.mesh.onRemoteStream(handler);
  }

  join(channelId: string, local: MediaStream | null): void {
    const gen = ++this.generation;
    void this.start(channelId, local, gen);
  }

  private async start(channelId: string, local: MediaStream | null, gen: number): Promise<void> {
    const sfu = this.createSfu();
    sfu.onRemoteStream(this.remoteHandler);
    try {
      await sfu.connect(channelId, this.selfId, local);
      if (gen !== this.generation) return sfu.leave(); // người dùng đã rời trong lúc đang nối
      this.active = sfu;
    } catch (err) {
      sfu.leave();
      if (gen !== this.generation) return;
      console.info('[voice] không dùng được SFU, chuyển sang mesh WebRTC', err);
      this.active = this.mesh;
      this.mesh.join(channelId, local);
    }
  }

  leave(): void {
    this.generation++;
    this.active?.leave();
    this.active = null;
  }

  handleSignal(envelope: SignalEnvelope): void {
    if (this.active === this.mesh) this.mesh.handleSignal(envelope);
  }
}
