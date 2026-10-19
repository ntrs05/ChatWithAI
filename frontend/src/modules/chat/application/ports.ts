import type { Attachment, Message, MessagePage } from '../domain/models';

export interface MessageRepository {
  /** UC05 — lấy lịch sử, phân trang ngược theo thời gian (cursor = id tin cũ nhất đang có). */
  list(channelId: string, opts: { before?: string; limit: number }): Promise<MessagePage>;
  search(channelId: string, query: string): Promise<Message[]>;
  /** UC04 — gửi tin nhắn (server sẽ phát 'chat.message.created' cho mọi người). */
  send(channelId: string, input: { content: string; attachmentIds: string[]; nonce: string }): Promise<Message>;
}

export interface FileStorage {
  /** UC06 — tải file/ảnh lên, báo tiến độ 0..1. */
  upload(file: File, onProgress: (ratio: number) => void): Promise<Attachment>;
  /** Lấy URL hiển thị cho tệp đính kèm. */
  resolveUrl(attachment: Attachment): Promise<string>;
}
