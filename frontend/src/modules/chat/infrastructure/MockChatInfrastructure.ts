import { ApiError, tokenStore } from '@/shared/http';
import { uid } from '@/shared/lib';
import { topics } from '@/shared/realtime';
import {
  getBlob,
  mutate,
  putBlob,
  readTable,
  requireMember,
  requireUser,
  respond,
  serverBroadcast,
  toPublicUser,
  type AttachmentRow,
  type MessageRow,
} from '@/mock-backend';
import type { FileStorage, MessageRepository } from '../application/ports';
import type { Attachment, Message, MessagePage } from '../domain/models';
import { isImage } from '../domain/rules';

/** Metadata tệp đã upload nhưng chưa gắn vào tin nhắn (giống bảng "uploads" ở server). */
const pendingUploads = new Map<string, AttachmentRow>();

const unaccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

function toMessage(row: MessageRow, nonce?: string): Message {
  const author = readTable('users').find((u) => u.id === row.authorId);
  return {
    id: row.id,
    channelId: row.channelId,
    serverId: row.serverId,
    content: row.content,
    attachments: row.attachments.map((a) => ({ ...a })),
    createdAt: row.createdAt,
    author: author
      ? toPublicUser(author)
      : { id: row.authorId, displayName: 'Người dùng đã xoá', username: 'deleted', avatarUrl: '' },
    ...(nonce ? { nonce } : {}),
  };
}

function requireChannelAccess(channelId: string) {
  const me = requireUser(tokenStore.get());
  const channel = readTable('channels').find((c) => c.id === channelId);
  if (!channel) throw new ApiError('Không tìm thấy kênh', 404);
  if (channel.type !== 'text') throw new ApiError('Kênh thoại không có tin nhắn', 400);
  requireMember(channel.serverId, me.id);
  return { me, channel };
}

export class MockMessageRepository implements MessageRepository {
  list(channelId: string, opts: { before?: string; limit: number }): Promise<MessagePage> {
    return respond(() => {
      requireChannelAccess(channelId);
      let rows = readTable('messages')
        .filter((m) => m.channelId === channelId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      if (opts.before) {
        const idx = rows.findIndex((m) => m.id === opts.before);
        if (idx >= 0) rows = rows.slice(0, idx);
      }
      const page = rows.slice(-opts.limit);
      return { messages: page.map((r) => toMessage(r)), hasMore: rows.length > page.length };
    }, [120, 300]);
  }

  search(channelId: string, query: string): Promise<Message[]> {
    return respond(() => {
      requireChannelAccess(channelId);
      const q = unaccent(query);
      if (!q) return [];
      return readTable('messages')
        .filter((m) => m.channelId === channelId && unaccent(m.content).includes(q))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 50)
        .map((r) => toMessage(r));
    });
  }

  send(channelId: string, input: { content: string; attachmentIds: string[]; nonce: string }): Promise<Message> {
    return respond(() => {
      const { me, channel } = requireChannelAccess(channelId);
      if (!input.content.trim() && input.attachmentIds.length === 0) throw new ApiError('Tin nhắn trống', 400);
      const attachments = input.attachmentIds.map((id) => {
        const meta = pendingUploads.get(id);
        if (!meta) throw new ApiError('Tệp đính kèm không tồn tại', 400);
        pendingUploads.delete(id);
        return meta;
      });
      const row: MessageRow = {
        id: uid('m'),
        channelId,
        serverId: channel.serverId,
        authorId: me.id,
        content: input.content.trim(),
        attachments,
        createdAt: new Date().toISOString(),
      };
      mutate('messages', (rows) => [...rows, row]);
      const message = toMessage(row, input.nonce);
      // PUBLISH tới mọi client đang subscribe server này
      serverBroadcast(topics.server(channel.serverId), 'chat.message.created', { message });
      return message;
    });
  }
}

export class MockFileStorage implements FileStorage {
  private urls = new Map<string, string>();

  async upload(file: File, onProgress: (ratio: number) => void): Promise<Attachment> {
    requireUser(tokenStore.get());
    const id = uid('f');
    // Mô phỏng tiến độ upload qua mạng
    const steps = Math.min(10, Math.max(3, Math.ceil(file.size / 200_000)));
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 60));
      onProgress(i / steps);
    }
    await putBlob(id, file);
    const meta: AttachmentRow = {
      id,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      kind: isImage(file.type) ? 'image' : 'file',
    };
    pendingUploads.set(id, meta);
    return { ...meta };
  }

  async resolveUrl(attachment: Attachment): Promise<string> {
    if (attachment.url) return attachment.url;
    const cached = this.urls.get(attachment.id);
    if (cached) return cached;
    const blob = await getBlob(attachment.id);
    if (!blob) throw new ApiError('Tệp không còn tồn tại', 404);
    const url = URL.createObjectURL(blob);
    this.urls.set(attachment.id, url);
    return url;
  }
}
