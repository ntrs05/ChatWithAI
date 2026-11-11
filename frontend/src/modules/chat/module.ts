import type { AppEventBus } from '@/shared/event-bus';
import type { RealtimeHub } from '@/shared/realtime';

// bootstrap.ts gọi hàm này đúng một lần lúc mở app.
export function initChatModule(_deps: { bus: AppEventBus; hub: RealtimeHub }): void {
  // TODO: tạo repository → service, rồi đăng ký nghe các sự kiện cần thiết trên bus/hub.
}
