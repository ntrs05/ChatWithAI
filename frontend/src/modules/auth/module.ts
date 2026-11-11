import type { AppEventBus } from '@/shared/event-bus';

// bootstrap.ts gọi hàm này đúng một lần lúc mở app.
export function initAuthModule(_deps: { bus: AppEventBus }): void {
  // TODO: tạo repository → service, rồi đăng ký nghe các sự kiện cần thiết trên bus/hub.
}
