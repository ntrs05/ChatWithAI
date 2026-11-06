import type { UserProfile } from '@/shared/types';

/** Một cuộc trò chuyện 1-1. Tin nhắn dùng chung hạ tầng với kênh nên `id` chính là id hội thoại (channelId của chat). */
export interface DirectChat {
  id: string;
  user: UserProfile;
  lastMessageAt: string | null;
  hasUnread: boolean;
  /** false = hai người đã hủy kết bạn: đọc được lịch sử nhưng không nhắn thêm được. */
  isFriend: boolean;
}
