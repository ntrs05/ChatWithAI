import type { ID } from '@/shared/types';
export interface FriendUser {
  id: ID;
  displayName: string;
  username: string;
  avatarUrl: string;
  status: string;
}

export interface Friend {
  id: ID;
  user: FriendUser;
  since: string;
}

export interface FriendRequest {
  id: ID;
  user: FriendUser;
  createdAt: string;
}

export type Relation = 'self' | 'friend' | 'incoming' | 'outgoing' | 'none';
