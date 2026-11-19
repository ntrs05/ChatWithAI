import { config } from '@/shared/config';
import { fallbackAvatar } from '@/shared/assets';
import { ApiError, http, tokenStore, uploadWithProgress } from '@/shared/http';
import { wire } from '@/shared/realtime';
import type { FileStorage, MessageRepository } from '../application/ports';
import type { Attachment, Message, MessagePage } from '../domain/models';
import { isImage } from '../domain/rules';

/* ---------- Dạng JSON của backend Nebula (MessageDto / AttachmentDto / FileDto) → model domain ---------- */

interface AttachmentDto {
  fileId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

interface MessageDto {
  id: string;
  conversationId: string;
  serverId: string | null;
  senderId: string;
  content: string;
  createdAt: string;
  isDeleted: boolean;
  isPinned?: boolean;
  editedAt?: string | null;
  reactions?: Array<{ emoji: string; count: number; userIds: string[] }>;
  attachments: AttachmentDto[];
  author: { id: string; displayName: string; username: string; avatarUrl: string | null } | null;
}

interface FileDto {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

const toAttachment = (a: AttachmentDto): Attachment => ({
  id: a.fileId,
  name: a.fileName,
  size: a.sizeBytes,
  mimeType: a.contentType,
  kind: isImage(a.contentType) ? 'image' : 'file',
});

export function toMessage(m: MessageDto): Message {
  const author = m.author ?? { id: m.senderId, displayName: 'Người dùng', username: '', avatarUrl: null };
  return {
    id: m.id,
    channelId: m.conversationId,
    serverId: m.serverId ?? '',
    author: {
      id: author.id,
      displayName: author.displayName,
      username: author.username,
      avatarUrl: author.avatarUrl || fallbackAvatar(author.id),
    },
    content: m.content,
    attachments: m.attachments.map(toAttachment),
    createdAt: m.createdAt,
    editedAt: m.editedAt ?? null,
    deleted: m.isDeleted,
    pinned: !!m.isPinned,
    reactions: (m.reactions ?? []).map((r) => ({ emoji: r.emoji, count: r.count, userIds: r.userIds })),
  };
}

export class HttpMessageRepository implements MessageRepository {
  async list(channelId: string, opts: { before?: string; limit: number }): Promise<MessagePage> {
    // `before` là id tin cũ nhất đang hiển thị; backend trả về tin xếp cũ → mới kèm hasMore.
    const page = await http<{ messages: MessageDto[]; hasMore: boolean }>(`/conversations/${channelId}/history`, {
      query: { beforeId: opts.before, take: opts.limit },
    });
    return { messages: page.messages.map(toMessage), hasMore: page.hasMore };
  }

  async search(channelId: string, q: string): Promise<Message[]> {
    const found = await http<MessageDto[]>('/search', { query: { q, conversationId: channelId, take: 30 } });
    return found.filter((m) => !m.isDeleted).map(toMessage);
  }

  async edit(messageId: string, content: string): Promise<Message> {
    return toMessage(await http<MessageDto>(`/messages/${messageId}`, { method: 'PUT', body: { content } }));
  }

  remove(messageId: string): Promise<void> {
    return http<void>(`/messages/${messageId}`, { method: 'DELETE' });
  }

  setPinned(messageId: string, pinned: boolean): Promise<void> {
    return http<void>(`/messages/${messageId}/pin`, { method: pinned ? 'PUT' : 'DELETE' });
  }

  react(messageId: string, emoji: string): Promise<void> {
    return http<void>(`/messages/${messageId}/reactions`, { method: 'POST', body: { emoji } });
  }

  async listPins(channelId: string): Promise<Message[]> {
    return (await http<MessageDto[]>(`/conversations/${channelId}/pins`)).filter((m) => !m.isDeleted).map(toMessage);
  }

  markRead(channelId: string): Promise<void> {
    return http<void>(`/conversations/${channelId}/read`, { method: 'PUT' });
  }

  async send(channelId: string, input: { content: string; attachmentIds: string[]; nonce: string }): Promise<Message> {
    return toMessage(
      await http<MessageDto>(`/conversations/${channelId}/messages`, {
        method: 'POST',
        body: { content: input.content, attachmentIds: input.attachmentIds },
      }),
    );
  }
}

export class HttpFileStorage implements FileStorage {
  async upload(file: File, onProgress: (ratio: number) => void): Promise<Attachment> {
    const form = new FormData();
    form.append('file', file);
    const dto = await uploadWithProgress<FileDto>('/files', form, onProgress);
    return {
      id: dto.id,
      name: dto.fileName,
      size: dto.sizeBytes,
      mimeType: dto.contentType,
      kind: isImage(dto.contentType) ? 'image' : 'file',
    };
  }

  /**
   * API tải file yêu cầu đăng nhập nên thẻ <img src> không tự gửi được token →
   * tải về bằng fetch có header Authorization rồi tạo blob URL cho trình duyệt hiển thị / tải xuống.
   */
  async resolveUrl(attachment: Attachment): Promise<string> {
    if (attachment.url) return attachment.url;
    const token = tokenStore.get();
    const res = await fetch(`${config.apiBaseUrl}/files/${attachment.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError('Không tải được tệp', res.status);
    return URL.createObjectURL(await res.blob());
  }
}

/** Sự kiện realtime của module Chat: tin nhắn mới và "đang gõ…". */
export function registerChatWire(): void {
  wire.onServerEvent<{ message: MessageDto | null }>('MessageReceived', 'chat.message.created', ({ message }) =>
    message ? { message: toMessage(message) } : null,
  );
  wire.onServerEvent<{ conversationId: string; userId: string; displayName: string }>('Typing', 'chat.typing', (e) => ({
    channelId: e.conversationId,
    userId: e.userId,
    displayName: e.displayName,
  }));
  // Tin bị sửa / xóa / ghim / đổi cảm xúc: server gửi kèm tin đã cập nhật.
  wire.onServerEvent<{ message: MessageDto | null }>('MessageChanged', 'chat.message.changed', ({ message }) =>
    message ? { message: toMessage(message) } : null,
  );
  // Client báo "đang gõ" → hàm Typing(conversationId) trên hub.
  wire.onClientEvent('chat.typing', (env) => ({ method: 'Typing', args: [(env.payload as { channelId: string }).channelId] }));
}
