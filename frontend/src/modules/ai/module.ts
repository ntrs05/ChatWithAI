import type { ApiMode } from '@/shared/config';
import type { AppEventBus } from '@/shared/event-bus';
import { AiService } from './application/AiService';
import { HttpAiGateway, MockAiGateway } from './infrastructure/gateways';

let instance: AiService | null = null;

export function initAiModule(deps: { bus: AppEventBus; mode: ApiMode }): AiService {
  instance = new AiService(deps.mode === 'mock' ? new MockAiGateway() : new HttpAiGateway(), deps.bus);
  return instance;
}

export function aiService(): AiService {
  if (!instance) throw new Error('Module AI chưa được khởi tạo');
  return instance;
}
