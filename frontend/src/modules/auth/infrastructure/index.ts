import type { AuthRepository } from '../application/ports';
import { HttpAuthRepository, registerAuthWire } from './HttpAuthRepository';

export function createAuthRepository(): AuthRepository {
  registerAuthWire();
  return new HttpAuthRepository();
}
