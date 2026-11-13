import type { AppNotification } from './domain/models';

declare module '@/shared/event-bus/events' {
  interface AppEvents {
    'notification.received': { notification: AppNotification };
  }
}

export {};
