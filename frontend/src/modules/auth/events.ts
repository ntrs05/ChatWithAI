import type { User } from './domain/User';
import type { UserProfile } from '@/shared/types';

/** Sự kiện do module Auth PUBLISH (các module khác subscribe). */
declare module '@/shared/event-bus/events' {
  interface AppEvents {
    'auth.loggedIn': { user: User; token: string };
    /** Người dùng vừa đổi tên / ảnh đại diện / giới thiệu — module khác cập nhật bản sao hồ sơ của mình. */
    'auth.profileUpdated': { user: User };
    /** (Realtime) BẤT KỲ ai đổi tên / ảnh đại diện — module nào đang giữ bản sao hồ sơ đó thì cập nhật. */
    'user.profileChanged': { user: UserProfile };
    /** (Realtime) Ai đó online / offline / bận / vắng mặt. */
    'user.statusChanged': { userId: string; status: string };
    'auth.loggingOut': Record<string, never>;
    'auth.loggedOut': Record<string, never>;
  }
}

export {};
