import type { NotificationRepository } from '../application/ports';
import { HttpNotificationRepository, registerNotificationsWire } from './HttpNotificationRepository';

export function createNotificationRepository(): NotificationRepository {
  registerNotificationsWire();
  return new HttpNotificationRepository();
}
