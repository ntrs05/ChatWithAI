/**
 * PUBLIC API của module Notifications (hộp thư thông báo).
 * Module khác CHỈ được import từ file này, không import sâu vào bên trong.
 */
import './events';

export { initNotificationsModule, notificationService } from './module';
export { useNotificationStore, selectUnread } from './application/notificationStore';
export type { AppNotification, NotificationTarget } from './domain/models';
export { targetOf } from './domain/rules';
export { NotificationsView } from './presentation/NotificationsView';
