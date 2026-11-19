import { create } from 'zustand';
import type { AppNotification } from '../domain/models';

interface NotificationState {
  items: AppNotification[];
  /** Tổng số chưa đọc (đếm trên server, không chỉ trong số đã tải). */
  unread: number;
  loaded: boolean;
  loadingMore: boolean;
  hasMore: boolean;
}

const initial: NotificationState = { items: [], unread: 0, loaded: false, loadingMore: false, hasMore: false };

export const useNotificationStore = create<NotificationState>(() => ({ ...initial }));
export const resetNotificationStore = () => useNotificationStore.setState({ ...initial });

export const selectUnread = (s: NotificationState) => s.unread;
