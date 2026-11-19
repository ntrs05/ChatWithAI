/**
 * COMPOSITION ROOT — nơi DUY NHẤT "lắp ráp" Modular Monolith:
 *   1. Tạo transport realtime (SignalR của backend Nebula).
 *   2. Khởi tạo từng module, truyền vào EventBus + RealtimeHub dùng chung.
 *   3. Khôi phục phiên đăng nhập → phát 'auth.loggedIn' → các module tự phản ứng.
 *
 * Các module KHÔNG gọi nhau trực tiếp. Chúng chỉ publish / subscribe sự kiện trên bus.
 */
import { config } from '@/shared/config';
import { bus, toast } from '@/shared/event-bus';
import { onUnauthorized } from '@/shared/http';
import { RealtimeHub, SignalRTransport } from '@/shared/realtime';
import { authService, initAuthModule } from '@/modules/auth';
import { initServerModule } from '@/modules/server';
import { initChatModule } from '@/modules/chat';
import { initVoiceModule } from '@/modules/voice';
import { initAiModule } from '@/modules/ai';
import { initAdminModule } from '@/modules/admin';
import { initFriendsModule } from '@/modules/friends';
import { initDirectModule } from '@/modules/direct';
import { initNotificationsModule } from '@/modules/notifications';

export async function bootstrap(): Promise<void> {
  const hub = new RealtimeHub(new SignalRTransport(config.hubUrl), bus);

  // Kết nối realtime theo vòng đời đăng nhập
  bus.subscribe('auth.loggedIn', ({ token }) => {
    hub.connect(token).catch(() => toast.error('Không kết nối được máy chủ realtime'));
  });
  bus.subscribe('auth.loggedOut', () => hub.disconnect());

  initAuthModule({ bus });
  // Token hết hạn / tài khoản bị khóa → đăng xuất để người dùng đăng nhập lại.
  onUnauthorized(() => {
    toast.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    void authService().logout();
  });
  initServerModule({ bus, hub });
  initChatModule({ bus, hub });
  initVoiceModule({ bus, hub });
  initFriendsModule({ bus });
  initDirectModule({ bus });
  initNotificationsModule({ bus });
  initAiModule({ bus });
  initAdminModule();

  await authService().restoreSession();
}
