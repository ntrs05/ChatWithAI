import type { AppNotification } from './domain/models';

/** Sự kiện của module Notifications. */
declare module '@/shared/event-bus/events' {
  interface AppEvents {
    /** (Realtime) Có thông báo mới trong hộp thư (được nhắc tên, tin nhắn riêng, lời mời, thay đổi nhóm…). */
    'notification.received': { notification: AppNotification };
  }
}

export {};
