/**
 * PUBLIC API của module Friends (kết bạn kiểu Discord).
 * Module khác CHỈ được import từ file này, không import sâu vào bên trong.
 */
import './events';

export { initFriendsModule, friendService } from './module';
export { useFriendStore, selectIncomingCount } from './application/friendStore';
export type { Friend, FriendRequest, FriendUser } from './domain/models';
export { FriendsView } from './presentation/FriendsView';
export { FriendPicker } from './presentation/FriendPicker';
