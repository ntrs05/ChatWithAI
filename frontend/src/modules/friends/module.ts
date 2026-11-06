import type { AppEventBus } from '@/shared/event-bus';
import { FriendService } from './application/FriendService';
import { createFriendRepository } from './infrastructure';

let instance: FriendService | null = null;

export function initFriendsModule(deps: { bus: AppEventBus }): FriendService {
  instance = new FriendService(createFriendRepository(), deps.bus);
  return instance;
}

export function friendService(): FriendService {
  if (!instance) throw new Error('Module Friends chưa được khởi tạo');
  return instance;
}
