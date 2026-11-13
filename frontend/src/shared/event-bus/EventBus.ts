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

  once<K extends keyof Events>(type: K, handler: Handler<Events[K]>): () => void {
    const off = this.subscribe(type, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  subscribeAll(handler: (type: keyof Events, payload: unknown) => void): () => void {
    this.wildcard.add(handler);
    return () => {
      this.wildcard.delete(handler);
    };
  }

  publish<K extends keyof Events>(type: K, payload: Events[K]): void {
    const set = this.handlers.get(type);
    if (set) {
      // copy để handler tự hủy được khi đang chạy
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
