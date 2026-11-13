import type { ID, UserProfile } from '@/shared/types';
export type NotificationType = string;

export interface AppNotification {
  id: ID;
  type: NotificationType;
  title: string;
  body: string;
  refType: string;
  refId: ID;
  actor: UserProfile | null;
  createdAt: string;
  isRead: boolean;
}

export type NotificationTarget =
  | { kind: 'conversation'; id: ID }
  | { kind: 'server'; id: ID }
  | { kind: 'invitations' }
  | { kind: 'friends' }
  | { kind: 'none' };
