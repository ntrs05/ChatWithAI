import type { Friend, FriendRequest } from './domain/models';

declare module '@/shared/event-bus/events' {
  interface AppEvents {
    'friend.request.received': { request: FriendRequest };
    'friend.request.sent': { request: FriendRequest };
    'friend.added': { friend: Friend; requestId: string };
    'friend.removed': { userId: string };
  }
}

export {};
