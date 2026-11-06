/**
 * PUBLIC API của module Direct (chat 1-1 giữa bạn bè).
 * Module khác CHỈ được import từ file này, không import sâu vào bên trong.
 */
import './events';

export { initDirectModule, directService } from './module';
export { useDirectStore, selectUnreadChats } from './application/directStore';
export type { DirectChat } from './domain/models';
export { DirectList } from './presentation/DirectList';
export { DirectPage } from './presentation/DirectPage';
export { MessageButton } from './presentation/MessageButton';
