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
  publish(envelope: RealtimeEnvelope): void;
  onEvent(handler: (envelope: RealtimeEnvelope) => void): () => void;
  onStateChange(handler: (state: RealtimeState) => void): () => void;
}
