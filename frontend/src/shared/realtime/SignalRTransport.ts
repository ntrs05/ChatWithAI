import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr';
import type { RealtimeEnvelope, RealtimeState, RealtimeTransport } from './RealtimeTransport';
import { wire } from './wire';

export class SignalRTransport implements RealtimeTransport {
  private connection: HubConnection | null = null;
  private eventHandlers = new Set<(e: RealtimeEnvelope) => void>();
  private stateHandlers = new Set<(s: RealtimeState) => void>();

  constructor(private readonly hubUrl: string) {}

  async connect(token: string): Promise<void> {
    this.disconnect();
    this.emitState('connecting');

    const connection = new HubConnectionBuilder()
      .withUrl(this.hubUrl, { accessTokenFactory: () => token })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
      .configureLogging(LogLevel.Warning)
      .build();
    this.connection = connection;

    for (const w of wire.inbound()) {
      connection.on(w.method, (raw: unknown) => {
        let payload: unknown;
        try {
          payload = w.decode(raw as never);
        } catch (err) {
          console.warn(`[realtime] không giải mã được "${w.method}"`, err);
          return;
        }
        if (payload != null) this.eventHandlers.forEach((h) => h({ topic: '', type: w.type, payload }));
      });
    }
    connection.onreconnecting(() => this.emitState('connecting'));
    connection.onreconnected(() => this.emitState('connected'));
    connection.onclose(() => this.emitState('disconnected'));

    await connection.start();
    this.emitState('connected');
  }

  disconnect(): void {
    const c = this.connection;
    this.connection = null;
    if (c) void c.stop().catch(() => {});
    this.emitState('disconnected');
  }

  subscribe(): void {
    /* server tự đẩy theo user — không cần đăng ký topic */
  }

  unsubscribe(): void {
    /* như trên */
  }

  publish(envelope: RealtimeEnvelope): void {
    const call = wire.encode(envelope);
    if (!call || this.connection?.state !== HubConnectionState.Connected) return;
    void this.connection.send(call.method, ...call.args).catch(() => {});
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
