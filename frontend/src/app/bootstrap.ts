/**
 * COMPOSITION ROOT — nơi DUY NHẤT "lắp ráp" Modular Monolith:
 *   1. Chọn hạ tầng (mock / http) cho transport realtime.
 *   2. Khởi tạo từng module, truyền vào EventBus + RealtimeHub dùng chung.
 *   3. Khôi phục phiên đăng nhập → phát 'auth.loggedIn' → các module tự phản ứng.
 *
 * Các module KHÔNG gọi nhau trực tiếp. Chúng chỉ publish / subscribe sự kiện trên bus.
 */
import { config } from '@/shared/config';
import { bus, toast } from '@/shared/event-bus';
import { RealtimeHub, SocketIoTransport, type RealtimeTransport } from '@/shared/realtime';
import { MockRealtimeTransport, ensureSeeded } from '@/mock-backend';
import { authService, initAuthModule } from '@/modules/auth';
import { initServerModule } from '@/modules/server';
import { initChatModule } from '@/modules/chat';
import { initVoiceModule } from '@/modules/voice';
import { initAiModule } from '@/modules/ai';

export async function bootstrap(): Promise<void> {
  const mode = config.apiMode;
  if (mode === 'mock') await ensureSeeded();

  const transport: RealtimeTransport = mode === 'mock' ? new MockRealtimeTransport() : new SocketIoTransport(config.socketUrl);
  const hub = new RealtimeHub(transport, bus);

  // Kết nối realtime theo vòng đời đăng nhập
  bus.subscribe('auth.loggedIn', ({ token }) => {
    hub.connect(token).catch(() => toast.error('Không kết nối được máy chủ realtime'));
  });
  bus.subscribe('auth.loggedOut', () => hub.disconnect());

  initAuthModule({ bus, mode });
  initServerModule({ bus, hub, mode });
  initChatModule({ bus, hub, mode });
  initVoiceModule({ bus, hub, mode });
  initAiModule({ bus, mode });

  await authService().restoreSession();
}
