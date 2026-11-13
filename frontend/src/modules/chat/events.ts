import type { Message } from './domain/models';

declare module '@/shared/event-bus/events' {
  interface AppEvents {
    'chat.message.created': { message: Message };
    'chat.message.changed': { message: Message };
    'chat.typing': { channelId: string; userId: string; displayName: string };
  }
}

export {};
