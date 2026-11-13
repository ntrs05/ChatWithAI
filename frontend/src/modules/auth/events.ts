import type { User } from './domain/User';
import type { UserProfile } from '@/shared/types';

declare module '@/shared/event-bus/events' {
  interface AppEvents {
    'auth.loggedIn': { user: User; token: string };
    'auth.profileUpdated': { user: User };
    'user.profileChanged': { user: UserProfile };
    'user.statusChanged': { userId: string; status: string };
    'auth.loggingOut': Record<string, never>;
    'auth.loggedOut': Record<string, never>;
  }
}

export {};
