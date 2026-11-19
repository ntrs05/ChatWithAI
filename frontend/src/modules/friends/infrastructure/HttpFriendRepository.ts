import { fallbackAvatar } from '@/shared/assets';
import { http } from '@/shared/http';
import { wire } from '@/shared/realtime';
import type { FriendRepository } from '../application/ports';
import type { Friend, FriendRequest, FriendUser } from '../domain/models';

/* Dạng JSON backend Nebula trả về (FriendDto / FriendRequestDto / PublicUserDto) → model domain. */
interface UserDto {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl: string | null;
  status: string;
}
interface FriendDto {
  id: string;
  user: UserDto;
  since: string;
}
interface RequestDto {
  id: string;
  user: UserDto;
  createdAt: string;
}

const toUser = (u: UserDto): FriendUser => ({
  id: u.id,
  displayName: u.displayName,
  username: u.username ?? '',
  avatarUrl: u.avatarUrl || fallbackAvatar(u.id),
  status: u.status,
});
const toFriend = (f: FriendDto): Friend => ({ id: f.id, user: toUser(f.user), since: f.since });
const toRequest = (r: RequestDto): FriendRequest => ({ id: r.id, user: toUser(r.user), createdAt: r.createdAt });

export class HttpFriendRepository implements FriendRepository {
  async listFriends(): Promise<Friend[]> {
    return (await http<FriendDto[]>('/friends')).map(toFriend);
  }

  async listRequests(): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }> {
    const r = await http<{ incoming: RequestDto[]; outgoing: RequestDto[] }>('/friends/requests');
    return { incoming: r.incoming.map(toRequest), outgoing: r.outgoing.map(toRequest) };
  }

  async sendRequestByTag(displayName: string, userCode: string): Promise<{ id: string; autoAccepted: boolean; displayName: string }> {
    const r = await http<{ id: string; autoAccepted: boolean }>('/friends/requests/by-tag', { method: 'POST', body: { displayName, userCode } });
    return { ...r, displayName };
  }

  accept(requestId: string): Promise<void> {
    return http<void>(`/friends/requests/${requestId}/accept`, { method: 'POST' });
  }

  declineOrCancel(requestId: string): Promise<void> {
    return http<void>(`/friends/requests/${requestId}`, { method: 'DELETE' });
  }

  remove(userId: string): Promise<void> {
    return http<void>(`/friends/${userId}`, { method: 'DELETE' });
  }
}

/** Sự kiện realtime của module Friends. */
export function registerFriendsWire(): void {
  wire.onServerEvent<{ request: RequestDto }>('FriendRequestReceived', 'friend.request.received', ({ request }) => ({
    request: toRequest(request),
  }));
  wire.onServerEvent<{ request: RequestDto }>('FriendRequestSent', 'friend.request.sent', ({ request }) => ({ request: toRequest(request) }));
  wire.onServerEvent<{ friend: FriendDto; requestId: string }>('FriendAdded', 'friend.added', ({ friend, requestId }) => ({
    friend: toFriend(friend),
    requestId,
  }));
  wire.onServerEvent<{ userId: string }>('FriendRemoved', 'friend.removed', ({ userId }) => ({ userId }));
}
