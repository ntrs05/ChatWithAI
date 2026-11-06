import type { AppEventBus } from '@/shared/event-bus';
import type { RealtimeHub } from '@/shared/realtime';
import { ServerService } from './application/ServerService';
import { createServerInfrastructure } from './infrastructure';

let instance: ServerService | null = null;

export function initServerModule(deps: { bus: AppEventBus; hub: RealtimeHub }): ServerService {
  const infra = createServerInfrastructure();
  instance = new ServerService(infra.servers, infra.settings, deps.bus, deps.hub);
  return instance;
}

export function serverService(): ServerService {
  if (!instance) throw new Error('Module Server chưa được khởi tạo');
  return instance;
}
