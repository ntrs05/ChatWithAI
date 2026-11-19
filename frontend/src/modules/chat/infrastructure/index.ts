import type { FileStorage, MessageRepository } from '../application/ports';
import { HttpFileStorage, HttpMessageRepository, registerChatWire } from './HttpChatInfrastructure';

export function createChatInfrastructure(): { messages: MessageRepository; files: FileStorage } {
  registerChatWire();
  return { messages: new HttpMessageRepository(), files: new HttpFileStorage() };
}
