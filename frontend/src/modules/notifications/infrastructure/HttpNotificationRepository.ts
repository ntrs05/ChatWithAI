import { fallbackAvatar } from '@/shared/assets';
import { http } from '@/shared/http';
import { wire } from '@/shared/realtime';
import type { NotificationRepository } from '../application/ports';
import type { AppNotification } from '../domain/models';

/** NotificationDto bên .NET. */
interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  refType: string;
  refId: string;
  createdAt: string;
  isRead: boolean;
  actor?: { id: string; displayName: string; username: string; avatarUrl: string | null } | null;
}

const toNotification = (d: NotificationDto): AppNotification => ({
  id: d.id,
  type: d.type,
  title: d.title,
  body: d.body,
  refType: d.refType,
  refId: d.refId,
  createdAt: d.createdAt,
  isRead: d.isRead,
  actor: d.actor ? { id: d.actor.id, displayName: d.actor.displayName, username: d.actor.username, avatarUrl: d.actor.avatarUrl || fallbackAvatar(d.actor.id) } : null,
});

export class HttpNotificationRepository implements NotificationRepository {
  async list(opts: { skip: number; take: number }): Promise<AppNotification[]> {
    return (await http<NotificationDto[]>('/notifications', { query: { skip: opts.skip, take: opts.take } })).map(toNotification);
  }

  async unreadCount(): Promise<number> {
    return (await http<{ count: number }>('/notifications/unread-count')).count;
  }

  markRead(id: string): Promise<void> {
    return http<void>(`/notifications/${id}/read`, { method: 'PUT' });
  }

  markAllRead(): Promise<void> {
    return http<void>('/notifications/read-all', { method: 'PUT' });
  }
}

/** Thông báo mới đẩy realtime từ backend. */
export function registerNotificationsWire(): void {
  wire.onServerEvent<NotificationDto>('NotificationReceived', 'notification.received', (d) => ({ notification: toNotification(d) }));
}
