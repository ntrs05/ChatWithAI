import type { ServerRepository, ServerSettingsRepository } from '../application/ports';
import { HttpServerRepository, HttpServerSettingsRepository, registerServerWire } from './HttpServerRepository';

export function createServerInfrastructure(): { servers: ServerRepository; settings: ServerSettingsRepository } {
  registerServerWire();
  return { servers: new HttpServerRepository(), settings: new HttpServerSettingsRepository() };
}
