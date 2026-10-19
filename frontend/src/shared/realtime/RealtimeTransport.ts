/**
 * Cổng (port) truyền tải realtime — tầng hạ tầng thay thế được:
 *   - MockRealtimeTransport  : BroadcastChannel giữa các tab trình duyệt
 *   - SocketIoTransport      : Socket.IO tới backend thật
 *
 * Mô hình Pub-Sub theo "topic":
 *   server:<serverId>   — tin nhắn, kênh mới, thành viên mới, trạng thái voice…
 *   voice:<channelId>   — tín hiệu WebRTC (offer/answer/ice)
 */
export interface RealtimeEnvelope {
  topic: string;
  type: string;
  payload: unknown;
}

export type RealtimeState = 'disconnected' | 'connecting' | 'connected';

export interface RealtimeTransport {
  connect(token: string): Promise<void>;
  disconnect(): void;
  subscribe(topic: string): void;
  unsubscribe(topic: string): void;
  /** Client phát sự kiện tạm thời (typing, tín hiệu WebRTC) tới các subscriber KHÁC của topic. */
  publish(envelope: RealtimeEnvelope): void;
  onEvent(handler: (envelope: RealtimeEnvelope) => void): () => void;
  onStateChange(handler: (state: RealtimeState) => void): () => void;
}
