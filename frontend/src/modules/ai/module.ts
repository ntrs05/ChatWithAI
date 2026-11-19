import type { AppEventBus } from '@/shared/event-bus';
import { AiService } from './application/AiService';
import { HttpAiGateway } from './infrastructure/gateways';

let instance: AiService | null = null;

export function initAiModule(deps: { bus: AppEventBus }): AiService {
  instance = new AiService(new HttpAiGateway(), deps.bus);
  return instance;
}

export function aiService(): AiService {
  if (!instance) throw new Error('Module AI chưa được khởi tạo');
  return instance;
}
