import type { Friend, FriendRequest } from './domain/models';

/** Sự kiện của module Friends. */
declare module '@/shared/event-bus/events' {
  interface AppEvents {
    /** (Realtime) Có người gửi lời mời kết bạn cho mình. */
    'friend.request.received': { request: FriendRequest };
    /** (Realtime) Mình vừa gửi một lời mời (đồng bộ giữa các tab / thiết bị). */
    'friend.request.sent': { request: FriendRequest };
    /** (Realtime) Hai người trở thành bạn bè (một lời mời được chấp nhận). */
    'friend.added': { friend: Friend; requestId: string };
    /** (Realtime) Quan hệ kết thúc: bị hủy kết bạn, lời mời bị từ chối hoặc bị hủy. */
    'friend.removed': { userId: string };
  }
}

export {};
