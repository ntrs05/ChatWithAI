import type { ID, UserProfile } from '@/shared/types';
export interface Attachment {
  id: ID;
  name: string;
  size: number;
  mimeType: string;
  kind: 'image' | 'file';
  /** URL tải về (backend thật). Với backend giả lập, URL được resolve từ IndexedDB. */
  url?: string;
}

/** Một loại cảm xúc trên một tin nhắn: ai đã thả. */
export interface Reaction {
  emoji: string;
  count: number;
  userIds: ID[];
}

export interface Message {
  id: ID;
  channelId: ID;
  serverId: ID;
  author: UserProfile;
  content: string;
  attachments: Attachment[];
  createdAt: string;
  /** Đã được sửa lúc nào (null/undefined = chưa sửa). */
  editedAt?: string | null;
  /** Đã bị xóa: nội dung và tệp bị gỡ, chỉ còn khung "Tin nhắn đã bị xóa". */
  deleted?: boolean;
  pinned?: boolean;
  reactions?: Reaction[];
  /** Trạng thái phía client (tin nhắn lạc quan đang gửi / gửi lỗi) */
  status?: 'sending' | 'failed';
  nonce?: string;
}

export interface MessagePage {
  messages: Message[];
  hasMore: boolean;
}

export interface PendingFile {
  id: string;
  file: File;
  previewUrl?: string;
  progress: number;
}
