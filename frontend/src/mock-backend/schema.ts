/**
 * "Lược đồ CSDL" của backend giả lập. Đây là dữ liệu phía SERVER — module frontend
 * không dùng trực tiếp kiểu này mà map sang domain của mình (giống map DTO từ REST).
 */
export interface UserRow {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  passwordHash: string;
  createdAt: string;
}

export interface SessionRow {
  token: string;
  userId: string;
  createdAt: string;
}

export interface ServerRow {
  id: string;
  name: string;
  iconUrl: string;
  description: string;
  ownerId: string;
  inviteCode: string;
  isPublic: boolean;
  createdAt: string;
}

export interface ChannelRow {
  id: string;
  serverId: string;
  name: string;
  type: 'text' | 'voice';
  topic: string;
  position: number;
  createdAt: string;
}

export interface MemberRow {
  serverId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface AttachmentRow {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: 'image' | 'file';
}

export interface MessageRow {
  id: string;
  channelId: string;
  serverId: string;
  authorId: string;
  content: string;
  attachments: AttachmentRow[];
  createdAt: string;
}

export interface VoiceStateRow {
  channelId: string;
  serverId: string;
  userId: string;
  clientId: string;
  muted: boolean;
  deafened: boolean;
  joinedAt: string;
  lastSeen: string;
}

export interface Tables {
  users: UserRow;
  sessions: SessionRow;
  servers: ServerRow;
  channels: ChannelRow;
  members: MemberRow;
  messages: MessageRow;
  voiceStates: VoiceStateRow;
}
