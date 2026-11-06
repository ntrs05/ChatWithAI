import type { AdminRepository } from '../application/ports';
import { HttpAdminRepository } from './HttpAdminRepository';

export function createAdminRepository(): AdminRepository {
  return new HttpAdminRepository();
}
