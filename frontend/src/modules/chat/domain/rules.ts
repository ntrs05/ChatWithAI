import { isSameDay } from '@/shared/lib';
import type { Message, Reaction } from './models';

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_FILES_PER_MESSAGE = 5;
/** Tin nhắn liên tiếp của cùng người trong khoảng này được gộp nhóm hiển thị */
const GROUP_WINDOW_MS = 5 * 60_000;

export function validateOutgoing(content: string, fileCount: number): string | null {
  if (!content.trim() && fileCount === 0) return 'Tin nhắn trống';
  if (content.length > MAX_MESSAGE_LENGTH) return `Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự`;
  if (fileCount > MAX_FILES_PER_MESSAGE) return `Tối đa ${MAX_FILES_PER_MESSAGE} tệp mỗi tin nhắn`;
  return null;
}

export function validateFile(file: File, maxBytes: number): string | null {
  if (file.size > maxBytes) return `"${file.name}" vượt quá ${(maxBytes / 1024 / 1024).toFixed(0)} MB`;
  return null;
}

export const isImage = (mime: string) => /^image\/(png|jpe?g|gif|webp|svg\+xml|avif)$/.test(mime);

/** Có nên hiển thị phần đầu (avatar + tên) cho tin nhắn này không. */
export function startsGroup(prev: Message | undefined, current: Message): boolean {
  if (!prev) return true;
  if (prev.author.id !== current.author.id) return true;
  if (!isSameDay(new Date(current.createdAt), new Date(prev.createdAt))) return true;
  return new Date(current.createdAt).getTime() - new Date(prev.createdAt).getTime() > GROUP_WINDOW_MS;
}

/** Chèn / thay thế tin nhắn theo id (hoặc nonce), luôn giữ thứ tự thời gian. */
export function mergeMessages(list: Message[], incoming: Message[]): Message[] {
  const result = [...list];
  for (const msg of incoming) {
    const idx = result.findIndex((m) => m.id === msg.id || (msg.nonce && m.nonce === msg.nonce));
    if (idx >= 0) result[idx] = { ...result[idx], ...msg, status: msg.status };
    else result.push(msg);
  }
  return result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/* ---------- Cảm xúc, sửa tin, quyền thao tác ---------- */

/** Các cảm xúc chọn nhanh. */
export const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥'] as const;

/** Bấm lần 1 thả cảm xúc, bấm lần 2 gỡ (giống backend). Trả về danh sách mới, không sửa bản cũ. */
export function toggleReaction(reactions: Reaction[] | undefined, emoji: string, userId: string): Reaction[] {
  const list = reactions ?? [];
  const existing = list.find((r) => r.emoji === emoji);
  if (!existing) return [...list, { emoji, count: 1, userIds: [userId] }];
  if (existing.userIds.includes(userId)) {
    const userIds = existing.userIds.filter((u) => u !== userId);
    return userIds.length === 0 ? list.filter((r) => r.emoji !== emoji) : list.map((r) => (r.emoji === emoji ? { ...r, count: userIds.length, userIds } : r));
  }
  const userIds = [...existing.userIds, userId];
  return list.map((r) => (r.emoji === emoji ? { ...r, count: userIds.length, userIds } : r));
}

export const hasReacted = (r: Reaction, userId: string | undefined) => !!userId && r.userIds.includes(userId);

/** Nội dung sửa phải hợp lệ như khi gửi (không rỗng, không quá dài). */
export function validateEdit(content: string): string | null {
  if (!content.trim()) return 'Nội dung không được để trống';
  if (content.length > MAX_MESSAGE_LENGTH) return `Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự`;
  return null;
}

export interface MessagePermissions {
  /** Ghim / bỏ ghim được tin nhắn (chủ server, hoặc cả hai người trong chat 1-1). */
  canPin: boolean;
  /** Xóa được tin của người khác (chủ server). Tin của chính mình thì luôn xóa được. */
  canDeleteOthers: boolean;
}

/** Thao tác nào hiện ra trên một tin nhắn. Tin đang gửi / gửi lỗi / đã xóa thì không có thao tác nào. */
export function messageActions(message: Message, meId: string | undefined, perms: MessagePermissions) {
  const live = !message.deleted && !message.status && !message.id.startsWith('local-');
  const mine = !!meId && message.author.id === meId;
  return {
    react: live,
    edit: live && mine,
    pin: live && perms.canPin,
    remove: live && (mine || perms.canDeleteOthers),
  };
}

/** Thay các lời nhắc tên dạng <@id> (quy ước của backend) bằng chữ dễ đọc. */
export const MENTION_RE = /<@[0-9a-fA-F-]{36}>/g;
export const stripMentions = (text: string) => text.replace(MENTION_RE, '@người-dùng');
