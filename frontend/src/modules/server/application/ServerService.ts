import type { AppEventBus } from '@/shared/event-bus';
import { ApiError } from '@/shared/http';
import { topics, type RealtimeHub } from '@/shared/realtime';
import type { Channel, CreateChannelInput, CreateServerInput, Invitation, Member, NotifyLevel, Server, ServerSettings } from '../domain/models';
import {
  defaultSettings,
  isDefaultSettings,
  isMentioned,
  muteUntil,
  normalizeChannelName,
  normalizeInviteCode,
  permissions,
  shouldCountUnread,
  validateChannel,
  validateServer,
} from '../domain/rules';
import type { ServerRepository, ServerSettingsRepository } from './ports';
import { resetServerStore, useServerStore } from './serverStore';

const upsert = <T>(list: T[], item: T, same: (a: T) => boolean) =>
  list.some(same) ? list.map((x) => (same(x) ? item : x)) : [...list, item];

/**
 * UC02 (Tạo / Tham gia Server) & UC03 (Tạo Kênh) — tầng Application.
 */
export class ServerService {
  private topicSubs = new Map<string, () => void>();

  constructor(
    private readonly repo: ServerRepository,
    private readonly settingsRepo: ServerSettingsRepository,
    private readonly bus: AppEventBus,
    private readonly hub: RealtimeHub,
  ) {
    // ---- SUBSCRIBE: phản ứng với sự kiện của module khác / từ realtime ----
    bus.subscribe('auth.loggedIn', ({ user }) => {
      useServerStore.setState({ meId: user.id });
      void this.loadMyServers();
      void this.loadSettings();
      void this.loadInvitations();
    });
    bus.subscribe('auth.loggedOut', () => {
      this.topicSubs.forEach((off) => off());
      this.topicSubs.clear();
      resetServerStore();
    });
    bus.subscribe('channel.created', ({ channel }) => this.upsertChannel(channel));
    bus.subscribe('channel.removed', ({ channelId, serverId }) => this.removeChannel(serverId, channelId));
    bus.subscribe('member.joined', ({ member }) => this.upsertMember(member));
    // Ai đó đổi tên / ảnh → cập nhật trong danh sách thành viên và lời mời
    bus.subscribe('user.profileChanged', ({ user }) =>
      useServerStore.setState((s) => ({
        members: Object.fromEntries(
          Object.entries(s.members).map(([id, list]) => [id, list.map((m) => (m.user.id === user.id ? { ...m, user: { ...m.user, ...user } } : m))]),
        ),
        invitations: s.invitations.map((i) => (i.invitedBy.id === user.id ? { ...i, invitedBy: { ...i.invitedBy, ...user } } : i)),
      })),
    );
    bus.subscribe('member.left', ({ serverId, userId }) => this.removeMember(serverId, userId));
    bus.subscribe('server.added', ({ serverId }) => {
      if (!useServerStore.getState().servers.some((x) => x.id === serverId)) void this.loadMyServers();
    });
    bus.subscribe('server.removed', ({ serverId, reason }) => this.handleRemoved(serverId, reason));
    // Lời mời vào server mới → tải lại danh sách lời mời (hiện ở Trang chủ).
    bus.subscribe('notification.received', ({ notification }) => {
      if (notification.refType !== 'JoinRequest') return;
      void this.loadInvitations();
      this.bus.publish('ui.toast', { kind: 'info', message: 'Bạn có lời mời vào một server mới' });
    });
    bus.subscribe('chat.message.created', ({ message }) => {
      const s = useServerStore.getState();
      if (!message.serverId) return; // chat 1-1: do module Direct theo dõi, không thuộc server nào
      if (message.author.id === s.meId || message.channelId === s.activeChannelId) return;
      // Server đang tắt âm / chỉ báo khi được nhắc tên → không tăng số chưa đọc.
      if (!shouldCountUnread(s.settings[message.serverId], isMentioned(message.content, s.meId))) return;
      const prev = s.unread[message.channelId]?.count ?? 0;
      useServerStore.setState({
        unread: { ...s.unread, [message.channelId]: { serverId: message.serverId, count: prev + 1 } },
      });
    });
  }

  async loadMyServers(): Promise<void> {
    const servers = await this.repo.listMine();
    useServerStore.setState({ servers, serversLoaded: true });
    servers.forEach((s) => this.watch(s.id));
    this.bus.publish('server.listLoaded', { serverIds: servers.map((s) => s.id) });
  }

  // ===== Cài đặt thông báo / tắt âm theo server (chuột phải vào server) =====

  async loadSettings(): Promise<void> {
    try {
      useServerStore.setState({ settings: await this.settingsRepo.list() });
    } catch {
      /* không có cài đặt thì dùng mặc định */
    }
  }

  setNotifyLevel(serverId: string, level: NotifyLevel): Promise<void> {
    return this.updateSettings(serverId, (cur) => ({ ...cur, level }));
  }

  /** Tắt âm server trong `minutes` phút, hoặc 'forever' (cho tới khi bật lại). */
  muteServer(serverId: string, minutes: number | 'forever'): Promise<void> {
    return this.updateSettings(serverId, (cur) => ({ ...cur, mutedUntil: muteUntil(minutes) }));
  }

  unmuteServer(serverId: string): Promise<void> {
    return this.updateSettings(serverId, (cur) => ({ ...cur, mutedUntil: null }));
  }

  /** Cập nhật ngay trên giao diện, rồi lưu lên server; lỗi thì hoàn tác. */
  private async updateSettings(serverId: string, change: (cur: ServerSettings) => ServerSettings): Promise<void> {
    const before = useServerStore.getState().settings;
    const next = change(before[serverId] ?? defaultSettings);
    useServerStore.setState((s) => {
      const { [serverId]: _old, ...rest } = s.settings;
      void _old;
      return { settings: isDefaultSettings(next) ? rest : { ...rest, [serverId]: next } };
    });
    try {
      if (isDefaultSettings(next)) await this.settingsRepo.reset(serverId);
      else await this.settingsRepo.save(serverId, next);
    } catch (err) {
      useServerStore.setState({ settings: before });
      throw err;
    }
  }

  // ===== Đánh dấu đã đọc / rời server =====

  /** Xóa số chưa đọc của mọi kênh trong server; module Chat nghe sự kiện để lưu mốc đã đọc lên server. */
  markServerRead(serverId: string): void {
    const s = useServerStore.getState();
    const unread = Object.fromEntries(Object.entries(s.unread).filter(([, u]) => u.serverId !== serverId));
    useServerStore.setState({ unread });
    const channelIds = (s.channels[serverId] ?? []).filter((c) => c.type === 'text').map((c) => c.id);
    this.bus.publish('server.markedRead', { serverId, channelIds });
  }

  async leaveServer(serverId: string): Promise<void> {
    const server = useServerStore.getState().servers.find((x) => x.id === serverId);
    await this.repo.leave(serverId);
    this.handleRemoved(serverId, 'Left');
    this.bus.publish('ui.toast', { kind: 'success', message: `Đã rời server${server ? ` "${server.name}"` : ''}` });
  }

  // ===== Mời người quen vào server =====

  /** Mời một người (thường chọn từ danh sách bạn bè). Người đó nhận thông báo và tự đồng ý. */
  inviteFriend(serverId: string, userId: string): Promise<void> {
    return this.repo.invite(serverId, userId);
  }

  async loadInvitations(): Promise<void> {
    try {
      useServerStore.setState({ invitations: await this.repo.listInvitations() });
    } catch {
      /* không quan trọng */
    }
  }

  async respondInvitation(invitation: Invitation, accept: boolean): Promise<void> {
    await this.repo.respondInvitation(invitation.id, accept);
    useServerStore.setState((s) => ({ invitations: s.invitations.filter((i) => i.id !== invitation.id) }));
    if (accept) {
      await this.loadMyServers();
      this.bus.publish('ui.toast', { kind: 'success', message: `Bạn đã tham gia "${invitation.serverName}"` });
    }
  }

  /** Tải kênh + thành viên của server (nếu chưa có). */
  async ensureServerData(serverId: string): Promise<Channel[]> {
    const state = useServerStore.getState();
    if (state.channels[serverId] && state.members[serverId]) return state.channels[serverId];
    const [channels, members] = await Promise.all([this.repo.listChannels(serverId), this.repo.listMembers(serverId)]);
    useServerStore.setState((s) => ({
      channels: { ...s.channels, [serverId]: channels },
      members: { ...s.members, [serverId]: members },
    }));
    return channels;
  }

  /** Mở một server/kênh theo URL. Trả về kênh thực sự được chọn. */
  async open(serverId: string, channelId?: string): Promise<Channel | null> {
    useServerStore.setState({ activeServerId: serverId });
    const channels = await this.ensureServerData(serverId);
    const s = useServerStore.getState();
    const target =
      channels.find((c) => c.id === channelId) ??
      channels.find((c) => c.id === s.lastChannel[serverId]) ??
      channels.find((c) => c.type === 'text') ??
      channels[0] ??
      null;
    if (target) this.selectChannel(target);
    return target;
  }

  selectChannel(channel: Channel): void {
    const s = useServerStore.getState();
    const { [channel.id]: _read, ...unread } = s.unread;
    void _read;
    useServerStore.setState({
      activeServerId: channel.serverId,
      activeChannelId: channel.id,
      lastChannel: { ...s.lastChannel, [channel.serverId]: channel.id },
      unread,
    });
    // PUBLISH: chat sẽ tải lịch sử, voice sẽ tự tham gia nếu là kênh thoại
    this.bus.publish('channel.selected', { serverId: channel.serverId, channel });
  }

  clearActive(): void {
    useServerStore.setState({ activeServerId: null, activeChannelId: null });
  }

  listPublicServers(): Promise<Server[]> {
    return this.repo.listPublic();
  }

  async createServer(input: CreateServerInput): Promise<Server> {
    const error = validateServer(input);
    if (error) throw new ApiError(error, 400);
    const server = await this.repo.create({ ...input, name: input.name.trim(), description: input.description.trim() });
    this.addJoinedServer(server);
    this.bus.publish('ui.toast', { kind: 'success', message: `Đã tạo server "${server.name}"` });
    return server;
  }

  async joinByInvite(code: string): Promise<Server> {
    const normalized = normalizeInviteCode(code);
    if (!normalized) throw new ApiError('Vui lòng nhập mã mời', 400);
    const server = await this.repo.joinByInvite(normalized);
    this.addJoinedServer(server);
    return server;
  }

  async joinPublic(serverId: string): Promise<Server> {
    const server = await this.repo.join(serverId);
    this.addJoinedServer(server);
    return server;
  }

  async createChannel(serverId: string, input: CreateChannelInput): Promise<Channel> {
    const s = useServerStore.getState();
    const role = s.members[serverId]?.find((m) => m.user.id === s.meId)?.role;
    if (!permissions.canCreateChannel(role)) throw new ApiError('Chỉ quản trị viên mới được tạo kênh', 403);
    const error = validateChannel(input);
    if (error) throw new ApiError(error, 400);
    const channel = await this.repo.createChannel(serverId, {
      ...input,
      name: normalizeChannelName(input.name, input.type),
      topic: input.topic.trim(),
    });
    this.upsertChannel(channel);
    return channel;
  }

  /** Chủ server đổi một kênh sang riêng tư / công khai. */
  async setChannelPrivacy(channel: Channel, isPrivate: boolean): Promise<Channel> {
    const updated = await this.repo.setChannelPrivacy(channel, isPrivate);
    this.upsertChannel(updated);
    return updated;
  }

  listChannelMembers(channelId: string) {
    return this.repo.listChannelMembers(channelId);
  }

  addChannelMember(channelId: string, userId: string) {
    return this.repo.addChannelMember(channelId, userId);
  }

  removeChannelMember(channelId: string, userId: string) {
    return this.repo.removeChannelMember(channelId, userId);
  }

  private addJoinedServer(server: Server) {
    useServerStore.setState((s) => ({ servers: upsert(s.servers, server, (x) => x.id === server.id) }));
    this.watch(server.id);
    this.bus.publish('server.joined', { server });
  }

  /** Subscribe topic realtime của server để nhận tin nhắn / kênh / thành viên mới. */
  private watch(serverId: string) {
    if (this.topicSubs.has(serverId)) return;
    this.topicSubs.set(serverId, this.hub.subscribe(topics.server(serverId)));
  }

  private upsertChannel(channel: Channel) {
    useServerStore.setState((s) => {
      const list = s.channels[channel.serverId];
      if (!list) return s;
      const next = upsert(list, channel, (c) => c.id === channel.id).sort((a, b) => a.position - b.position);
      return { channels: { ...s.channels, [channel.serverId]: next } };
    });
  }

  /** Mình không còn thấy kênh này nữa: bỏ khỏi danh sách, nếu đang mở thì chuyển sang kênh khác. */
  private removeChannel(serverId: string, channelId: string) {
    const before = useServerStore.getState();
    const list = before.channels[serverId];
    if (!list) return;
    const next = list.filter((c) => c.id !== channelId);
    useServerStore.setState((s) => ({ channels: { ...s.channels, [serverId]: next } }));
    if (before.activeChannelId === channelId) {
      const fallback = next.find((c) => c.type === 'text') ?? next[0];
      if (fallback) this.selectChannel(fallback);
      else useServerStore.setState({ activeChannelId: null });
    }
  }

  /** Một thành viên rời server. Nếu chính mình là người đó thì dọn server khỏi giao diện. */
  private removeMember(serverId: string, userId: string) {
    if (userId === useServerStore.getState().meId) return this.handleRemoved(serverId, 'Left');
    useServerStore.setState((s) => {
      const list = s.members[serverId];
      return list ? { members: { ...s.members, [serverId]: list.filter((m) => m.user.id !== userId) } } : s;
    });
  }

  /** Mình bị xóa khỏi server / server bị xóa: bỏ khỏi danh sách và đưa người dùng ra màn hình chính nếu đang xem server đó. */
  private handleRemoved(serverId: string, reason: string) {
    const before = useServerStore.getState();
    const server = before.servers.find((x) => x.id === serverId);
    if (!server) return;
    this.topicSubs.get(serverId)?.();
    this.topicSubs.delete(serverId);
    useServerStore.setState((s) => {
      const { [serverId]: _c, ...channels } = s.channels;
      const { [serverId]: _m, ...members } = s.members;
      const { [serverId]: _s, ...settings } = s.settings;
      void _c;
      void _m;
      void _s;
      return {
        servers: s.servers.filter((x) => x.id !== serverId),
        channels,
        members,
        settings,
        unread: Object.fromEntries(Object.entries(s.unread).filter(([, u]) => u.serverId !== serverId)),
        ...(s.activeServerId === serverId ? { activeServerId: null, activeChannelId: null } : {}),
      };
    });
    if (reason !== 'Left') {
      const why = reason === 'Deleted' ? 'đã bị xóa' : reason === 'Banned' ? 'đã cấm bạn' : 'đã xóa bạn khỏi nhóm';
      this.bus.publish('ui.toast', { kind: 'info', message: `Server "${server.name}" ${why}` });
    }
  }

  private upsertMember(member: Member) {
    useServerStore.setState((s) => {
      const list = s.members[member.serverId];
      if (!list) return s;
      return { members: { ...s.members, [member.serverId]: upsert(list, member, (m) => m.user.id === member.user.id) } };
    });
  }
}
