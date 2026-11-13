import type { AppEventBus, AppEvents } from '../event-bus';
import type { RealtimeEnvelope, RealtimeState, RealtimeTransport } from './RealtimeTransport';

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
    // connect() reset topic nên đăng ký lại
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
