import { io, type Socket } from 'socket.io-client';
import type { RealtimeEnvelope, RealtimeState, RealtimeTransport } from './RealtimeTransport';

/**
 * Transport dùng Socket.IO cho backend thật.
 *
 * Hợp đồng với server:
 *   client → server : 'subscribe' (topic) | 'unsubscribe' (topic) | 'publish' ({topic,type,payload})
 *   server → client : 'event' ({topic,type,payload})
 */
export class SocketIoTransport implements RealtimeTransport {
  private socket: Socket | null = null;
  private topics = new Set<string>();
  private eventHandlers = new Set<(e: RealtimeEnvelope) => void>();
  private stateHandlers = new Set<(s: RealtimeState) => void>();

  constructor(private readonly url: string) {}

  connect(token: string): Promise<void> {
    this.disconnect();
    this.emitState('connecting');
    const socket = io(this.url || undefined, { auth: { token }, transports: ['websocket'] });
    this.socket = socket;

    socket.on('event', (e: RealtimeEnvelope) => this.eventHandlers.forEach((h) => h(e)));
    socket.on('disconnect', () => this.emitState('disconnected'));
    socket.on('connect', () => {
      this.emitState('connected');
      // Sau khi kết nối lại, đăng ký lại toàn bộ topic
      for (const topic of this.topics) socket.emit('subscribe', topic);
    });

    return new Promise((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', (err) => reject(err));
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.topics.clear();
    this.emitState('disconnected');
  }

  subscribe(topic: string): void {
    this.topics.add(topic);
    this.socket?.emit('subscribe', topic);
  }

  unsubscribe(topic: string): void {
    this.topics.delete(topic);
    this.socket?.emit('unsubscribe', topic);
  }

  publish(envelope: RealtimeEnvelope): void {
    this.socket?.emit('publish', envelope);
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
