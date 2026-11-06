import type { ID, UserProfile } from '@/shared/types';

/** Mention · DirectMessage · AddedToServer · RemovedFromServer · RoleChanged · JoinRequest · ServerOwner · FriendRequest · FriendAccepted */
export type NotificationType = string;

export interface AppNotification {
  id: ID;
  type: NotificationType;
  title: string;
  body: string;
  /** Bấm vào thì mở cái gì: Conversation (kênh / chat 1-1) · Server · JoinRequest · Friend */
  refType: string;
  refId: ID;
  /** Người gây ra thông báo (người nhắc tên, người mời…), null nếu là hệ thống. */
  actor: UserProfile | null;
  createdAt: string;
  isRead: boolean;
}

/** Đích đến khi bấm vào một thông báo (module nào biết đường dẫn thì tự đổi ra URL). */
export type NotificationTarget =
  | { kind: 'conversation'; id: ID }
  | { kind: 'server'; id: ID }
  | { kind: 'invitations' }
  | { kind: 'friends' }
  | { kind: 'none' };
