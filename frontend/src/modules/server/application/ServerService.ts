import type { AppEventBus } from '@/shared/event-bus';
import { ApiError } from '@/shared/http';
import { topics, type RealtimeHub } from '@/shared/realtime';
import type { Channel, CreateChannelInput, CreateServerInput, Member, Server } from '../domain/models';
import { normalizeChannelName, normalizeInviteCode, permissions, validateChannel, validateServer } from '../domain/rules';
import type { ServerRepository } from './ports';
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
    private readonly bus: AppEventBus,
    private readonly hub: RealtimeHub,
  ) {
    // ---- SUBSCRIBE: phản ứng với sự kiện của module khác / từ realtime ----
    bus.subscribe('auth.loggedIn', ({ user }) => {
      useServerStore.setState({ meId: user.id });
      void this.loadMyServers();
    });
    bus.subscribe('auth.loggedOut', () => {
      this.topicSubs.forEach((off) => off());
      this.topicSubs.clear();
      resetServerStore();
    });
    bus.subscribe('channel.created', ({ channel }) => this.upsertChannel(channel));
    bus.subscribe('member.joined', ({ member }) => this.upsertMember(member));
    bus.subscribe('chat.message.created', ({ message }) => {
      const s = useServerStore.getState();
      if (message.author.id === s.meId || message.channelId === s.activeChannelId) return;
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

  private upsertMember(member: Member) {
    useServerStore.setState((s) => {
      const list = s.members[member.serverId];
      if (!list) return s;
      return { members: { ...s.members, [member.serverId]: upsert(list, member, (m) => m.user.id === member.user.id) } };
    });
  }
}
