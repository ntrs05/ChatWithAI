import type { Message } from './domain/models';

/** Sự kiện của module Chat. */
declare module '@/shared/event-bus/events' {
  interface AppEvents {
    /** (Realtime) Có tin nhắn mới trong một kênh. */
    'chat.message.created': { message: Message };
    /** (Realtime, tạm thời) Ai đó đang gõ phím. */
    'chat.typing': { channelId: string; userId: string; displayName: string };
  }
}

export {};
