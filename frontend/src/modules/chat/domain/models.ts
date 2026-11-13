import type { ID, UserProfile } from '@/shared/types';
export interface Attachment {
  id: ID;
  name: string;
  size: number;
  mimeType: string;
  kind: 'image' | 'file';
  url?: string;
}

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
  editedAt?: string | null;
  deleted?: boolean;
  pinned?: boolean;
  reactions?: Reaction[];
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
