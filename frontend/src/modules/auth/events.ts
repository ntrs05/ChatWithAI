import type { User } from './domain/User';

/** Sự kiện do module Auth PUBLISH (các module khác subscribe). */
declare module '@/shared/event-bus/events' {
  interface AppEvents {
    'auth.loggedIn': { user: User; token: string };
    'auth.loggingOut': Record<string, never>;
    'auth.loggedOut': Record<string, never>;
  }
}

export {};
