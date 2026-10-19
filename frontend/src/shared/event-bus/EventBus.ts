/**
 * PUB-SUB — Event Bus có kiểu (typed) dùng làm "xương sống" giao tiếp giữa các module.
 *
 *  - Publisher chỉ biết TÊN SỰ KIỆN + PAYLOAD, không biết ai đang lắng nghe.
 *  - Subscriber đăng ký theo tên sự kiện, không biết ai phát ra.
 *  → Các module (auth, server, chat, voice, ai) không phụ thuộc trực tiếp vào nhau.
 *
 * Sự kiện realtime từ server (Socket.IO / BroadcastChannel) cũng được RealtimeHub
 * đẩy vào chính bus này, nên module không cần phân biệt sự kiện local hay remote.
 */
export type Handler<P> = (payload: P) => void;

export class EventBus<Events extends object> {
  private handlers = new Map<keyof Events, Set<Handler<never>>>();
  private wildcard = new Set<(type: keyof Events, payload: unknown) => void>();

  subscribe<K extends keyof Events>(type: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as Handler<never>);
    return () => {
      set!.delete(handler as Handler<never>);
    };
  }

  /** Đăng ký một lần, tự huỷ sau khi nhận sự kiện đầu tiên. */
  once<K extends keyof Events>(type: K, handler: Handler<Events[K]>): () => void {
    const off = this.subscribe(type, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  /** Lắng nghe mọi sự kiện — dùng cho debug/log. */
  subscribeAll(handler: (type: keyof Events, payload: unknown) => void): () => void {
    this.wildcard.add(handler);
    return () => {
      this.wildcard.delete(handler);
    };
  }

  publish<K extends keyof Events>(type: K, payload: Events[K]): void {
    const set = this.handlers.get(type);
    if (set) {
      // Sao chép để handler có thể tự huỷ đăng ký trong lúc chạy
      for (const handler of [...set]) {
        try {
          (handler as Handler<Events[K]>)(payload);
        } catch (err) {
          console.error(`[EventBus] handler của "${String(type)}" bị lỗi`, err);
        }
      }
    }
    for (const handler of this.wildcard) handler(type, payload);
  }

  clear(): void {
    this.handlers.clear();
    this.wildcard.clear();
  }
}
