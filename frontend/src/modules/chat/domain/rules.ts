import { isSameDay } from '@/shared/lib';
import type { Message } from './models';

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
