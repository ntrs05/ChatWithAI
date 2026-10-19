import type { ApiMode } from '@/shared/config';
import type { FileStorage, MessageRepository } from '../application/ports';
import { HttpFileStorage, HttpMessageRepository } from './HttpChatInfrastructure';
import { MockFileStorage, MockMessageRepository } from './MockChatInfrastructure';

export function createChatInfrastructure(mode: ApiMode): { messages: MessageRepository; files: FileStorage } {
  return mode === 'mock'
    ? { messages: new MockMessageRepository(), files: new MockFileStorage() }
    : { messages: new HttpMessageRepository(), files: new HttpFileStorage() };
}
