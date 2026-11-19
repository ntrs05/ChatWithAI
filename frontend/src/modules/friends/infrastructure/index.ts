import type { FriendRepository } from '../application/ports';
import { HttpFriendRepository, registerFriendsWire } from './HttpFriendRepository';

export function createFriendRepository(): FriendRepository {
  registerFriendsWire();
  return new HttpFriendRepository();
}
