/**
 * PUBLIC API của module Chat
 * (UC04 — Gửi/Nhận tin nhắn, UC05 — Xem lịch sử, UC06 — Tải lên File/Hình ảnh).
 */
import './events';

export { initChatModule, chatService } from './module';
export { useChatStore } from './application/chatStore';
export type { Message, Attachment, Reaction } from './domain/models';
export type { MessagePermissions } from './domain/rules';
export { ChatView } from './presentation/ChatView';
