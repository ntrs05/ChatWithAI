import type { DirectRepository } from '../application/ports';
import { HttpDirectRepository } from './HttpDirectRepository';

export function createDirectRepository(): DirectRepository {
  return new HttpDirectRepository();
}
