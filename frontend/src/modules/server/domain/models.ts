import type { ID, UserProfile } from '@/shared/types';

export interface Server {
  id: ID;
  name: string;
  iconUrl: string;
  description: string;
  ownerId: ID;
  inviteCode: string;
  isPublic: boolean;
  createdAt: string;
  memberCount?: number;
}

export type ChannelType = 'text' | 'voice';

export interface Channel {
  id: ID;
  serverId: ID;
  name: string;
  type: ChannelType;
  topic: string;
  position: number;
  createdAt: string;
}

export type Role = 'admin' | 'member';

export interface Member {
  serverId: ID;
  user: UserProfile;
  role: Role;
  joinedAt: string;
}

export interface CreateServerInput {
  name: string;
  iconUrl: string;
  description: string;
  isPublic: boolean;
}

export interface CreateChannelInput {
  name: string;
  type: ChannelType;
  topic: string;
}
