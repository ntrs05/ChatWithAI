import { config } from '@/shared/config';
import { http, uploadWithProgress } from '@/shared/http';
import type { FileStorage, MessageRepository } from '../application/ports';
import type { Attachment, Message, MessagePage } from '../domain/models';

export class HttpMessageRepository implements MessageRepository {
  list(channelId: string, opts: { before?: string; limit: number }): Promise<MessagePage> {
    return http<MessagePage>(`/channels/${channelId}/messages`, { query: { before: opts.before, limit: opts.limit } });
  }

  search(channelId: string, q: string): Promise<Message[]> {
    return http<Message[]>(`/channels/${channelId}/messages/search`, { query: { q } });
  }

  send(channelId: string, input: { content: string; attachmentIds: string[]; nonce: string }): Promise<Message> {
    return http<Message>(`/channels/${channelId}/messages`, { method: 'POST', body: input });
  }
}

export class HttpFileStorage implements FileStorage {
  upload(file: File, onProgress: (ratio: number) => void): Promise<Attachment> {
    const form = new FormData();
    form.append('file', file);
    return uploadWithProgress<Attachment>('/uploads', form, onProgress);
  }

  async resolveUrl(attachment: Attachment): Promise<string> {
    return attachment.url ?? `${config.apiBaseUrl}/uploads/${attachment.id}`;
  }
}
