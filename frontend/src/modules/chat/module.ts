import type { ApiMode } from '@/shared/config';
import type { AppEventBus } from '@/shared/event-bus';
import type { RealtimeHub } from '@/shared/realtime';
import { ChatService } from './application/ChatService';
import { createChatInfrastructure } from './infrastructure';

let instance: ChatService | null = null;

export function initChatModule(deps: { bus: AppEventBus; hub: RealtimeHub; mode: ApiMode }): ChatService {
  const infra = createChatInfrastructure(deps.mode);
  instance = new ChatService(infra.messages, infra.files, deps.bus, deps.hub);
  return instance;
}

export function chatService(): ChatService {
  if (!instance) throw new Error('Module Chat chưa được khởi tạo');
  return instance;
}
