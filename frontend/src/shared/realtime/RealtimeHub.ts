import type { AppEventBus, AppEvents } from '../event-bus';
import type { RealtimeEnvelope, RealtimeState, RealtimeTransport } from './RealtimeTransport';

/**
 * Cầu nối Pub-Sub: Transport (mạng) ⇄ EventBus (trong ứng dụng).
 *
 * Mọi sự kiện nhận từ server được publish lại lên EventBus với đúng tên sự kiện,
 * nên module chỉ cần `bus.subscribe('chat.message.created', …)` là nhận được cả
 * sự kiện do chính tab này tạo ra lẫn sự kiện từ người dùng khác.
 */
export class RealtimeHub {
  private refCount = new Map<string, number>();
  private offEvent: (() => void) | null = null;
  private _state: RealtimeState = 'disconnected';

  constructor(
    private readonly transport: RealtimeTransport,
    private readonly bus: AppEventBus,
  ) {
    transport.onStateChange((s) => {
      this._state = s;
    });
  }

  get state(): RealtimeState {
    return this._state;
  }

  async connect(token: string): Promise<void> {
    this.offEvent?.();
    this.offEvent = this.transport.onEvent((e: RealtimeEnvelope) => {
      this.bus.publish(e.type as keyof AppEvents, e.payload as never);
    });
    // connect() reset danh sách topic một cách đồng bộ → đăng ký lại ngay sau đó
    const connecting = this.transport.connect(token);
    for (const topic of this.refCount.keys()) this.transport.subscribe(topic);
    await connecting;
  }

  disconnect(): void {
    this.offEvent?.();
    this.offEvent = null;
    this.refCount.clear();
    this.transport.disconnect();
  }

  /** Đăng ký topic (đếm tham chiếu). Trả về hàm huỷ đăng ký. */
  subscribe(topic: string): () => void {
    const n = this.refCount.get(topic) ?? 0;
    this.refCount.set(topic, n + 1);
    if (n === 0) this.transport.subscribe(topic);
    let done = false;
    return () => {
      if (done) return;
      done = true;
      const left = (this.refCount.get(topic) ?? 1) - 1;
      if (left <= 0) {
        this.refCount.delete(topic);
        this.transport.unsubscribe(topic);
      } else {
        this.refCount.set(topic, left);
      }
    };
  }

  publish<K extends keyof AppEvents>(topic: string, type: K, payload: AppEvents[K]): void {
    this.transport.publish({ topic, type: type as string, payload });
  }
}
