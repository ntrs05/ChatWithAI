import type { ApiMode } from '@/shared/config';
import type { AppEventBus } from '@/shared/event-bus';
import type { RealtimeHub } from '@/shared/realtime';
import { ServerService } from './application/ServerService';
import { createServerRepository } from './infrastructure';

let instance: ServerService | null = null;

export function initServerModule(deps: { bus: AppEventBus; hub: RealtimeHub; mode: ApiMode }): ServerService {
  instance = new ServerService(createServerRepository(deps.mode), deps.bus, deps.hub);
  return instance;
}

export function serverService(): ServerService {
  if (!instance) throw new Error('Module Server chưa được khởi tạo');
  return instance;
}
