import type { RealtimeEnvelope } from './RealtimeTransport';

/**
 * "Dây nối" giữa tên sự kiện của backend (SignalR) và tên sự kiện của EventBus trong ứng dụng.
 *
 * Mỗi module tự ĐĂNG KÝ cách giải mã sự kiện của mình (ở tầng infrastructure), nên:
 *   - transport (shared) không phải biết kiểu dữ liệu của bất kỳ module nào,
 *   - backend đổi tên field chỉ phải sửa đúng một module,
 *   - EventBus vẫn chỉ nhìn thấy kiểu dữ liệu của domain (Message, Channel…), không thấy dạng JSON thô của server.
 */

export interface InboundWire {
  /** Tên sự kiện server gửi xuống (SignalR client method), vd "MessageReceived". */
  method: string;
  /** Tên sự kiện trên EventBus, vd "chat.message.created". */
  type: string;
  /** Đổi payload thô → payload của domain. Trả về null để bỏ qua sự kiện này. */
  decode: (raw: never) => unknown | null;
}

export interface OutboundWire {
  /** Tên hàm trên hub, vd "Typing". */
  method: string;
  args: unknown[];
}

const inbound = new Map<string, InboundWire>();
const outbound = new Map<string, (envelope: RealtimeEnvelope) => OutboundWire | null>();

export const wire = {
  /** Server → client. */
  onServerEvent<Raw = unknown>(method: string, type: string, decode: (raw: Raw) => unknown | null = (raw) => raw): void {
    inbound.set(method, { method, type, decode: decode as InboundWire['decode'] });
  },
  /** Client → server: sự kiện tạm thời (typing, tín hiệu WebRTC) được chuyển thành lời gọi hàm trên hub. */
  onClientEvent(type: string, encode: (envelope: RealtimeEnvelope) => OutboundWire | null): void {
    outbound.set(type, encode);
  },
  inbound: (): InboundWire[] => [...inbound.values()],
  encode: (envelope: RealtimeEnvelope): OutboundWire | null => outbound.get(envelope.type)?.(envelope) ?? null,
};
