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
  /** Kênh riêng tư: chỉ chủ server và người được thêm mới thấy. */
  isPrivate?: boolean;
}

/** owner = chủ server · moderator = quản trị viên · member = thành viên (giống Discord). */
export type Role = 'owner' | 'moderator' | 'member';

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
  isPrivate?: boolean;
  /** Người được vào kênh riêng tư (chủ server luôn được vào). */
  memberIds?: string[];
}

/** Mức thông báo của CẢ một server (chuột phải vào server → Cài đặt thông báo). */
export type NotifyLevel = 'all' | 'mentions' | 'nothing';

export interface ServerSettings {
  level: NotifyLevel;
  /** Tắt âm tới thời điểm này (ISO). null = không tắt âm. */
  mutedUntil: string | null;
}

/** Lời mời vào server do người khác gửi, đang chờ mình trả lời. */
export interface Invitation {
  id: ID;
  serverId: ID;
  serverName: string;
  iconUrl: string;
  memberCount: number;
  invitedBy: UserProfile;
  createdAt: string;
}
