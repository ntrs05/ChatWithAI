import type { ApiMode } from '@/shared/config';
import type { AuthRepository } from '../application/ports';
import { HttpAuthRepository } from './HttpAuthRepository';
import { MockAuthRepository } from './MockAuthRepository';

export function createAuthRepository(mode: ApiMode): AuthRepository {
  return mode === 'mock' ? new MockAuthRepository() : new HttpAuthRepository();
}
