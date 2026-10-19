import type { ApiMode } from '@/shared/config';
import type { ServerRepository } from '../application/ports';
import { HttpServerRepository } from './HttpServerRepository';
import { MockServerRepository } from './MockServerRepository';

export function createServerRepository(mode: ApiMode): ServerRepository {
  return mode === 'mock' ? new MockServerRepository() : new HttpServerRepository();
}
