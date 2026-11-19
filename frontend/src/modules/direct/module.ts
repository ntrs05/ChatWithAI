import type { AppEventBus } from '@/shared/event-bus';
import { DirectService } from './application/DirectService';
import { createDirectRepository } from './infrastructure';

let instance: DirectService | null = null;

export function initDirectModule(deps: { bus: AppEventBus }): DirectService {
  instance = new DirectService(createDirectRepository(), deps.bus);
  return instance;
}

export function directService(): DirectService {
  if (!instance) throw new Error('Module Direct chưa được khởi tạo');
  return instance;
}
