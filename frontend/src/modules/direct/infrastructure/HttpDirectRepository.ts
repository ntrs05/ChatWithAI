import { fallbackAvatar } from '@/shared/assets';
import { http } from '@/shared/http';
import type { DirectRepository } from '../application/ports';
import type { DirectChat } from '../domain/models';

/** DirectDto bên .NET. */
interface DirectDto {
  conversationId: string;
  otherUserId: string;
  lastMessageAt: string | null;
  hasUnread: boolean;
  isFriend: boolean;
  other: { id: string; displayName: string; username: string; avatarUrl: string | null } | null;
}

const toChat = (d: DirectDto): DirectChat => ({
  id: d.conversationId,
  lastMessageAt: d.lastMessageAt,
  hasUnread: d.hasUnread,
  isFriend: d.isFriend,
  user: {
    id: d.otherUserId,
    displayName: d.other?.displayName ?? 'Người dùng',
    username: d.other?.username ?? '',
    avatarUrl: d.other?.avatarUrl || fallbackAvatar(d.otherUserId),
  },
});

export class HttpDirectRepository implements DirectRepository {
  async list(): Promise<DirectChat[]> {
    return (await http<DirectDto[]>('/direct')).map(toChat);
  }

  async open(userId: string): Promise<DirectChat> {
    return toChat(await http<DirectDto>('/direct', { method: 'POST', body: { userId } }));
  }
}
