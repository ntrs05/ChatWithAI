import type { RealtimeEnvelope } from './RealtimeTransport';


export interface InboundWire {
  method: string;
  type: string;
  decode: (raw: never) => unknown | null;
}

export interface OutboundWire {
  method: string;
  args: unknown[];
}

const inbound = new Map<string, InboundWire>();
const outbound = new Map<string, (envelope: RealtimeEnvelope) => OutboundWire | null>();

export const wire = {
  onServerEvent<Raw = unknown>(method: string, type: string, decode: (raw: Raw) => unknown | null = (raw) => raw): void {
    inbound.set(method, { method, type, decode: decode as InboundWire['decode'] });
  },
  onClientEvent(type: string, encode: (envelope: RealtimeEnvelope) => OutboundWire | null): void {
    outbound.set(type, encode);
  },
  inbound: (): InboundWire[] => [...inbound.values()],
  encode: (envelope: RealtimeEnvelope): OutboundWire | null => outbound.get(envelope.type)?.(envelope) ?? null,
};
