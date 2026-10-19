import type { RealtimeEnvelope, RealtimeState, RealtimeTransport } from '@/shared/realtime';

const CHANNEL_NAME = 'nebula-realtime';

/**
 * Kênh "phía server": khi backend giả muốn phát sự kiện, nó post vào BroadcastChannel này.
 * BroadcastChannel gửi tới MỌI đối tượng cùng tên (mọi tab, kể cả tab hiện tại)
 * trừ chính đối tượng gửi → transport của tab hiện tại cũng nhận được.
 */
const serverChannel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

/** Server phát sự kiện cho tất cả client đang subscribe `topic`. */
export function serverBroadcast(topic: string, type: string, payload: unknown): void {
  serverChannel?.postMessage({ topic, type, payload } satisfies RealtimeEnvelope);
}

/**
 * Transport giả lập WebSocket bằng BroadcastChannel.
 * Mở 2 tab (đăng nhập 2 tài khoản khác nhau) để thấy chat/voice realtime.
 */
export class MockRealtimeTransport implements RealtimeTransport {
  private channel: BroadcastChannel | null = null;
  private topics = new Set<string>();
  private eventHandlers = new Set<(e: RealtimeEnvelope) => void>();
  private stateHandlers = new Set<(s: RealtimeState) => void>();

  async connect(): Promise<void> {
    this.disconnect();
    this.emitState('connecting');
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = (ev: MessageEvent<RealtimeEnvelope>) => {
      const env = ev.data;
      if (!env || !this.topics.has(env.topic)) return;
      this.eventHandlers.forEach((h) => h(env));
    };
    this.emitState('connected');
  }

  disconnect(): void {
    this.channel?.close();
    this.channel = null;
    this.topics.clear();
    this.emitState('disconnected');
  }

  subscribe(topic: string): void {
    this.topics.add(topic);
  }

  unsubscribe(topic: string): void {
    this.topics.delete(topic);
  }

  publish(envelope: RealtimeEnvelope): void {
    // Gửi tới các tab khác (không quay về chính đối tượng gửi — giống socket.to(room))
    this.channel?.postMessage(envelope);
  }

  onEvent(handler: (e: RealtimeEnvelope) => void): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  onStateChange(handler: (s: RealtimeState) => void): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  private emitState(s: RealtimeState) {
    this.stateHandlers.forEach((h) => h(s));
  }
}
