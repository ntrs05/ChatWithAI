import type { ID } from '@/shared/types';
/** Hồ sơ rút gọn của một người trong danh sách bạn bè. */
export interface FriendUser {
  id: ID;
  displayName: string;
  username: string;
  avatarUrl: string;
  /** Online | Idle | DoNotDisturb | Offline (theo backend). */
  status: string;
}

export interface Friend {
  /** Id của quan hệ (không phải id người dùng). */
  id: ID;
  user: FriendUser;
  since: string;
}

export interface FriendRequest {
  id: ID;
  user: FriendUser;
  createdAt: string;
}

/** Quan hệ giữa mình và một người khác — quyết định nút hiện ra (Kết bạn / Đã gửi / Chấp nhận…). */
export type Relation = 'self' | 'friend' | 'incoming' | 'outgoing' | 'none';
