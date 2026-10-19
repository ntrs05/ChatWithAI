import type { PeerMesh } from '../application/ports';
import { isInitiator, type SignalData, type SignalEnvelope } from '../domain/models';

type SendSignal = (envelope: SignalEnvelope) => void;

interface Peer {
  pc: RTCPeerConnection;
  pendingIce: RTCIceCandidateInit[];
}

/**
 * Mesh WebRTC: mỗi cặp thành viên có một RTCPeerConnection riêng.
 * Phù hợp phòng nhỏ (≤ 6–8 người); phòng lớn nên dùng SFU (mediasoup, LiveKit…).
 */
export class WebRtcMesh implements PeerMesh {
  private peers = new Map<string, Peer>();
  private channelId: string | null = null;
  private local: MediaStream | null = null;
  private remoteHandler: (clientId: string, stream: MediaStream | null) => void = () => {};

  constructor(
    private readonly selfId: string,
    private readonly send: SendSignal,
    private readonly iceServers: RTCIceServer[],
  ) {}

  onRemoteStream(handler: (clientId: string, stream: MediaStream | null) => void): void {
    this.remoteHandler = handler;
  }

  join(channelId: string, local: MediaStream | null): void {
    this.channelId = channelId;
    this.local = local;
    this.signal({ kind: 'hello' });
  }

  leave(): void {
    if (this.channelId) this.signal({ kind: 'bye' });
    for (const id of [...this.peers.keys()]) this.closePeer(id);
    this.channelId = null;
    this.local = null;
  }

  handleSignal(env: SignalEnvelope): void {
    void this.process(env).catch((err) => console.warn('[webrtc] xử lý tín hiệu lỗi', env.data.kind, err));
  }

  private async process({ from, data }: SignalEnvelope): Promise<void> {
    switch (data.kind) {
      case 'hello': {
        if (this.peers.has(from)) return;
        if (isInitiator(this.selfId, from)) await this.makeOffer(from);
        else this.signal({ kind: 'hello' }, from); // nhờ bên kia (id nhỏ hơn) khởi tạo
        return;
      }
      case 'offer': {
        const peer = this.ensurePeer(from);
        await peer.pc.setRemoteDescription(data.sdp);
        await this.flushIce(peer);
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        this.signal({ kind: 'answer', sdp: peer.pc.localDescription!.toJSON() }, from);
        return;
      }
      case 'answer': {
        const peer = this.peers.get(from);
        if (!peer || peer.pc.signalingState !== 'have-local-offer') return;
        await peer.pc.setRemoteDescription(data.sdp);
        await this.flushIce(peer);
        return;
      }
      case 'ice': {
        const peer = this.peers.get(from);
        if (!peer) return;
        if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(data.candidate);
        else peer.pendingIce.push(data.candidate);
        return;
      }
      case 'bye':
        this.closePeer(from);
        return;
    }
  }

  private async makeOffer(peerId: string) {
    const peer = this.ensurePeer(peerId);
    const offer = await peer.pc.createOffer();
    await peer.pc.setLocalDescription(offer);
    this.signal({ kind: 'offer', sdp: peer.pc.localDescription!.toJSON() }, peerId);
  }

  private ensurePeer(peerId: string): Peer {
    const existing = this.peers.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const peer: Peer = { pc, pendingIce: [] };
    this.peers.set(peerId, peer);

    if (this.local) {
      for (const track of this.local.getAudioTracks()) pc.addTrack(track, this.local);
    } else {
      pc.addTransceiver('audio', { direction: 'recvonly' }); // không có mic → chỉ nghe
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) this.signal({ kind: 'ice', candidate: e.candidate.toJSON() }, peerId);
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      this.remoteHandler(peerId, stream);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.closePeer(peerId);
    };
    return peer;
  }

  private async flushIce(peer: Peer) {
    const queued = peer.pendingIce.splice(0);
    for (const c of queued) await peer.pc.addIceCandidate(c);
  }

  private closePeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    this.peers.delete(peerId);
    peer.pc.onicecandidate = null;
    peer.pc.ontrack = null;
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
    this.remoteHandler(peerId, null);
  }

  private signal(data: SignalData, to?: string) {
    if (!this.channelId) return;
    this.send({ channelId: this.channelId, from: this.selfId, to, data });
  }
}
