import type { AppNotification } from '../domain/models';

export interface NotificationRepository {
  list(opts: { skip: number; take: number }): Promise<AppNotification[]>;
  unreadCount(): Promise<number>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}
