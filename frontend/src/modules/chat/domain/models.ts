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

export interface Message {
  id: ID;
  channelId: ID;
  serverId: ID;
  author: UserProfile;
  content: string;
  attachments: Attachment[];
  createdAt: string;
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
