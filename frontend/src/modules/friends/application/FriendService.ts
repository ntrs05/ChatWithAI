import type { AppEventBus } from '@/shared/event-bus';
import { errorMessage } from '@/shared/http';
import { ApiError } from '@/shared/http';
import type { Friend, FriendRequest, FriendUser } from '../domain/models';
import { parseUserCode, sortFriends, validateAddFriend, type AddFriendInput } from '../domain/rules';
import type { FriendRepository } from './ports';
import { resetFriendStore, useFriendStore } from './friendStore';

const upsertById = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];

/**
 * Bạn bè — gửi / nhận / chấp nhận lời mời, danh sách bạn (tầng Application).
 * Realtime từ backend (friend.*) cập nhật danh sách ngay; sau mỗi thao tác của chính mình, danh sách được tải lại
 * để luôn khớp với server.
 */
export class FriendService {
  constructor(
    private readonly repo: FriendRepository,
    private readonly bus: AppEventBus,
  ) {
    bus.subscribe('auth.loggedIn', ({ user }) => {
      useFriendStore.setState({ meId: user.id });
      void this.load();
    });
    bus.subscribe('auth.loggedOut', () => resetFriendStore());

    bus.subscribe('friend.request.received', ({ request }) => {
      useFriendStore.setState((s) => ({ incoming: upsertById(s.incoming, request) }));
      this.bus.publish('ui.toast', { kind: 'info', message: `${request.user.displayName} đã gửi lời mời kết bạn` });
    });
    bus.subscribe('friend.request.sent', ({ request }) => {
      useFriendStore.setState((s) => ({ outgoing: upsertById(s.outgoing, request) }));
    });
    bus.subscribe('friend.added', ({ friend, requestId }) => {
      const s = useFriendStore.getState();
      const wasMine = s.outgoing.some((r) => r.id === requestId);
      useFriendStore.setState({
        friends: upsertById(s.friends, friend),
        incoming: s.incoming.filter((r) => r.id !== requestId),
        outgoing: s.outgoing.filter((r) => r.id !== requestId),
      });
      if (wasMine) this.bus.publish('ui.toast', { kind: 'success', message: `${friend.user.displayName} đã chấp nhận lời mời kết bạn` });
    });
    // Bạn đổi tên / ảnh, hoặc online / offline → cập nhật ngay trong mọi danh sách
    const patchUser = (userId: string, patch: Partial<FriendUser>) => {
      const fix = <T extends { user: FriendUser }>(list: T[]): T[] => list.map((x) => (x.user.id === userId ? { ...x, user: { ...x.user, ...patch } } : x));
      useFriendStore.setState((s) => ({ friends: fix(s.friends), incoming: fix(s.incoming), outgoing: fix(s.outgoing) }));
    };
    bus.subscribe('user.profileChanged', ({ user }) => patchUser(user.id, { displayName: user.displayName, username: user.username, avatarUrl: user.avatarUrl }));
    bus.subscribe('user.statusChanged', ({ userId, status }) => patchUser(userId, { status }));
    bus.subscribe('friend.removed', ({ userId }) => {
      useFriendStore.setState((s) => ({
        friends: s.friends.filter((f) => f.user.id !== userId),
        incoming: s.incoming.filter((r) => r.user.id !== userId),
        outgoing: s.outgoing.filter((r) => r.user.id !== userId),
      }));
    });
  }

  async load(): Promise<void> {
    try {
      const [friends, requests] = await Promise.all([this.repo.listFriends(), this.repo.listRequests()]);
      useFriendStore.setState({ friends: sortFriends(friends), incoming: requests.incoming, outgoing: requests.outgoing, loaded: true });
    } catch (err) {
      useFriendStore.setState({ loaded: true });
      this.bus.publish('ui.toast', { kind: 'error', message: errorMessage(err, 'Không tải được danh sách bạn bè') });
    }
  }

  /** Kết bạn bằng TÊN + ID: phải biết đúng cả hai (backend trả cùng một lỗi cho mọi trường hợp sai để không dò được người dùng). */
  async sendRequestByTag(input: AddFriendInput): Promise<void> {
    const errors = validateAddFriend(input);
    if (Object.keys(errors).length > 0) throw new ApiError(Object.values(errors)[0]!, 400);
    const name = input.displayName.trim();
    const r = await this.repo.sendRequestByTag(name, parseUserCode(input.userCode)!);
    await this.load();
    this.bus.publish('ui.toast', {
      kind: 'success',
      message: r.autoAccepted ? `Bạn và ${name} đã trở thành bạn bè` : `Đã gửi lời mời kết bạn tới ${name}`,
    });
  }

  async accept(request: FriendRequest): Promise<void> {
    await this.repo.accept(request.id);
    await this.load();
    this.bus.publish('ui.toast', { kind: 'success', message: `Bạn và ${request.user.displayName} đã trở thành bạn bè` });
  }

  /** Từ chối lời mời đến hoặc hủy lời mời đã gửi. */
  async declineOrCancel(request: FriendRequest): Promise<void> {
    await this.repo.declineOrCancel(request.id);
    useFriendStore.setState((s) => ({
      incoming: s.incoming.filter((r) => r.id !== request.id),
      outgoing: s.outgoing.filter((r) => r.id !== request.id),
    }));
  }

  async remove(friend: Friend): Promise<void> {
    await this.repo.remove(friend.user.id);
    useFriendStore.setState((s) => ({ friends: s.friends.filter((f) => f.id !== friend.id) }));
    this.bus.publish('ui.toast', { kind: 'info', message: `Đã hủy kết bạn với ${friend.user.displayName}` });
  }
}
