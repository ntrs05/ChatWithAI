import type { Attachment, Message, MessagePage } from '../domain/models';

export interface MessageRepository {
  /** UC05 — lấy lịch sử, phân trang ngược theo thời gian (cursor = id tin cũ nhất đang có). */
  list(channelId: string, opts: { before?: string; limit: number }): Promise<MessagePage>;
  search(channelId: string, query: string): Promise<Message[]>;
  /** Đánh dấu đã đọc tới hiện tại (server lưu mốc để tính tin chưa đọc). */
  markRead(channelId: string): Promise<void>;
  /** Sửa nội dung tin của chính mình. */
  edit(messageId: string, content: string): Promise<Message>;
  /** Xóa tin (người gửi, hoặc chủ server với tin trong nhóm). */
  remove(messageId: string): Promise<void>;
  setPinned(messageId: string, pinned: boolean): Promise<void>;
  /** Thả / gỡ cảm xúc (bấm lần 2 thì gỡ). */
  react(messageId: string, emoji: string): Promise<void>;
  /** Các tin đang được ghim trong hội thoại, mới ghim nhất trước. */
  listPins(channelId: string): Promise<Message[]>;
  /** UC04 — gửi tin nhắn (server sẽ phát 'chat.message.created' cho mọi người). */
  send(channelId: string, input: { content: string; attachmentIds: string[]; nonce: string }): Promise<Message>;
}

export interface FileStorage {
  /** UC06 — tải file/ảnh lên, báo tiến độ 0..1. */
  upload(file: File, onProgress: (ratio: number) => void): Promise<Attachment>;
  /** Lấy URL hiển thị cho tệp đính kèm. */
  resolveUrl(attachment: Attachment): Promise<string>;
}
