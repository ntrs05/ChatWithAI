import type { ApiMode } from '@/shared/config';
import type { AppEventBus } from '@/shared/event-bus';
import { AuthService } from './application/AuthService';
import { createAuthRepository } from './infrastructure';

let instance: AuthService | null = null;

export function initAuthModule(deps: { bus: AppEventBus; mode: ApiMode }): AuthService {
  instance = new AuthService(createAuthRepository(deps.mode), deps.bus);
  return instance;
}

export function authService(): AuthService {
  if (!instance) throw new Error('Module Auth chưa được khởi tạo');
  return instance;
}
