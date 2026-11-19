import type { AppEventBus } from '@/shared/event-bus';
import { NotificationService } from './application/NotificationService';
import { createNotificationRepository } from './infrastructure';

let instance: NotificationService | null = null;

export function initNotificationsModule(deps: { bus: AppEventBus }): NotificationService {
  instance = new NotificationService(createNotificationRepository(), deps.bus);
  return instance;
}

export function notificationService(): NotificationService {
  if (!instance) throw new Error('Module Notifications chưa được khởi tạo');
  return instance;
}
