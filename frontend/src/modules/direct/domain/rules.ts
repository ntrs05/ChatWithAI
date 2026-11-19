import type { DirectChat } from './models';

/** Cuộc trò chuyện có tin mới nhất lên trước; chưa có tin nào thì xuống cuối. */
export function sortChats(chats: DirectChat[]): DirectChat[] {
  return [...chats].sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
}

export const upsertChat = (chats: DirectChat[], chat: DirectChat): DirectChat[] =>
  sortChats(chats.some((c) => c.id === chat.id) ? chats.map((c) => (c.id === chat.id ? chat : c)) : [...chats, chat]);

/** Lý do không cho nhắn tin (hiện thay cho ô soạn tin), hoặc null nếu nhắn được. */
export const blockedReason = (chat: DirectChat): string | null =>
  chat.isFriend ? null : `Bạn và ${chat.user.displayName} không còn là bạn bè nên không thể nhắn tin. Bạn vẫn xem lại được lịch sử trò chuyện.`;
