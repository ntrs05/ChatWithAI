// lắp các module lại với nhau
// mỗi module tự viết tiếp trong module.ts của nó
import { config } from '@/shared/config';
import { bus } from '@/shared/event-bus';
import { RealtimeHub, SignalRTransport } from '@/shared/realtime';
import { initAuthModule } from '@/modules/auth';
import { initServerModule } from '@/modules/server';
import { initChatModule } from '@/modules/chat';
import { initDirectModule } from '@/modules/direct';
import { initFriendsModule } from '@/modules/friends';
import { initNotificationsModule } from '@/modules/notifications';
import { initVoiceModule } from '@/modules/voice';
import { initAiModule } from '@/modules/ai';
import { initAdminModule } from '@/modules/admin';

export async function bootstrap(): Promise<void> {
  const hub = new RealtimeHub(new SignalRTransport(config.hubUrl), bus);
  initAuthModule({ bus });
  initServerModule({ bus, hub });
  initChatModule({ bus, hub });
  initDirectModule({ bus });
  initFriendsModule({ bus });
  initNotificationsModule({ bus });
  initVoiceModule({ bus, hub });
  initAiModule({ bus });
  initAdminModule();

  // TODO: đợi auth khai báo 'auth.loggedIn' / 'auth.loggedOut' trong auth/events.ts rồi mở mấy dòng này:
  //   bus.subscribe('auth.loggedIn', ({ token }) => { hub.connect(token).catch(() => toast.error('Không kết nối được máy chủ realtime')); });
  //   bus.subscribe('auth.loggedOut', () => hub.disconnect());
}
