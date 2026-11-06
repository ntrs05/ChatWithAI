import { fallbackAvatar, fallbackServerIcon } from '@/shared/assets';
import { http } from '@/shared/http';
import { sleep } from '@/shared/lib';
import { wire } from '@/shared/realtime';
import type { UserProfile } from '@/shared/types';
import type { ServerRepository, ServerSettingsRepository } from '../application/ports';
import type { Channel, CreateChannelInput, CreateServerInput, Invitation, Member, NotifyLevel, Server, ServerSettings } from '../domain/models';
import {
  flattenChannels,
  toChannel,
  toMember,
  toServer,
  type ChannelDto,
  type ServerChannelsDto,
  type ServerDto,
  type MemberProfileDto,
} from './httpMappers';

/** Hiện thực ServerRepository bằng REST API của backend Nebula. */
export class HttpServerRepository implements ServerRepository {
  /** Category của từng server (lấy từ lần listChannels gần nhất) để biết kênh mới nên nằm vào category nào. */
  private categories = new Map<string, ServerChannelsDto['categories']>();

  async listMine(): Promise<Server[]> {
    return (await http<ServerDto[]>('/servers')).map(toServer);
  }

  /** Nhóm công khai (JoinPolicy = Open) hoặc cho xin vào; chưa có tham gia. */
  async listPublic(): Promise<Server[]> {
    return (await http<ServerDto[]>('/servers/joinable')).map(toServer);
  }

  async create(input: CreateServerInput): Promise<Server> {
    const joinPolicy = input.isPublic ? 'Open' : 'InviteOnly';
    let server = await http<ServerDto>('/servers', {
      method: 'POST',
      body: { name: input.name, description: input.description, joinPolicy },
    });
    // Tạo server chưa nhận biểu tượng → đặt luôn sau khi tạo.
    if (input.iconUrl) {
      server = await http<ServerDto>(`/servers/${server.id}`, {
        method: 'PUT',
        body: { name: server.name, description: server.description, avatarUrl: input.iconUrl, joinPolicy },
      }).then(
        () => ({ ...server, avatarUrl: input.iconUrl }),
        () => server, // không đặt được biểu tượng thì vẫn giữ server vừa tạo
      );
    }
    return toServer(server);
  }

  async joinByInvite(code: string): Promise<Server> {
    return toServer(await http<ServerDto>('/servers/join-by-code', { method: 'POST', body: { code } }));
  }

  async join(serverId: string): Promise<Server> {
    return toServer(await http<ServerDto>(`/servers/${serverId}/join`, { method: 'POST' }));
  }

  async listChannels(serverId: string): Promise<Channel[]> {
    // Backend tạo kênh mặc định (#general, kênh thoại) bằng sự kiện bất đồng bộ ngay sau khi tạo nhóm, nên vài chục
    // mili-giây đầu danh sách có thể còn rỗng. Thử lại ngắn để không hiển thị server "không có kênh nào".
    for (let attempt = 0; ; attempt++) {
      const dto = await http<ServerChannelsDto>(`/servers/${serverId}/channels`);
      const channels = flattenChannels(dto);
      if (channels.length > 0 || attempt >= 6) {
        this.categories.set(serverId, dto.categories);
        return channels;
      }
      await sleep(150 * (attempt + 1));
    }
  }

  async createChannel(serverId: string, input: CreateChannelInput): Promise<Channel> {
    const kind = input.type === 'voice' ? 'Voice' : 'Text';
    // Đặt kênh vào category đang chứa các kênh cùng loại ("Kênh chat" / "Kênh thoại").
    const categoryId = this.categories.get(serverId)?.find((c) => c.channels.some((ch) => ch.kind === kind))?.id ?? null;
    const dto = await http<ChannelDto>(`/servers/${serverId}/channels`, {
      method: 'POST',
      body: { name: input.name, kind, categoryId, topic: input.topic || null, isPrivate: input.isPrivate ?? false, memberIds: input.memberIds ?? [] },
    });
    return toChannel(dto);
  }

  async setChannelPrivacy(channel: Channel, isPrivate: boolean): Promise<Channel> {
    const dto = await http<ChannelDto>(`/channels/${channel.id}`, {
      method: 'PUT',
      body: { name: channel.name, topic: channel.topic || null, isPrivate },
    });
    return toChannel(dto);
  }

  async listChannelMembers(channelId: string): Promise<UserProfile[]> {
    const list = await http<Array<{ id: string; displayName: string; username: string; avatarUrl: string | null }>>(`/channels/${channelId}/members`);
    return list.map((u) => ({ id: u.id, displayName: u.displayName, username: u.username, avatarUrl: u.avatarUrl || fallbackAvatar(u.id) }));
  }

  addChannelMember(channelId: string, userId: string): Promise<void> {
    return http<void>(`/channels/${channelId}/members`, { method: 'POST', body: { userId } });
  }

  removeChannelMember(channelId: string, userId: string): Promise<void> {
    return http<void>(`/channels/${channelId}/members/${userId}`, { method: 'DELETE' });
  }

  async listMembers(serverId: string): Promise<Member[]> {
    return (await http<MemberProfileDto[]>(`/servers/${serverId}/members`)).map(toMember);
  }

  leave(serverId: string): Promise<void> {
    return http<void>(`/servers/${serverId}/leave`, { method: 'POST' });
  }

  async invite(serverId: string, userId: string): Promise<void> {
    await http(`/servers/${serverId}/invites`, { method: 'POST', body: { userId } });
  }

  async listInvitations(): Promise<Invitation[]> {
    const list = await http<InvitationDto[]>('/join-requests/invitations');
    return list.map((i) => ({
      id: i.id,
      serverId: i.serverId,
      serverName: i.serverName,
      iconUrl: i.serverAvatarUrl || fallbackServerIcon(i.serverId),
      memberCount: i.memberCount,
      createdAt: i.createdAt,
      invitedBy: {
        id: i.invitedBy.id,
        displayName: i.invitedBy.displayName,
        username: i.invitedBy.username,
        avatarUrl: i.invitedBy.avatarUrl || fallbackAvatar(i.invitedBy.id),
      },
    }));
  }

  async respondInvitation(invitationId: string, accept: boolean): Promise<void> {
    await http(`/join-requests/${invitationId}/respond`, { method: 'POST', body: { accept } });
  }
}

/** InvitationDto bên .NET (lời mời vào nhóm kèm tên nhóm và người mời). */
interface InvitationDto {
  id: string;
  serverId: string;
  serverName: string;
  serverAvatarUrl: string | null;
  memberCount: number;
  invitedBy: { id: string; displayName: string; username: string; avatarUrl: string | null };
  createdAt: string;
}

/* ---------- Cài đặt thông báo theo server: GET/PUT/DELETE /api/notifications/servers ---------- */
interface ServerSettingDto {
  serverId: string;
  level: 'All' | 'MentionsOnly' | 'Nothing';
  mutedUntil: string | null;
}
const LEVEL_TO_DTO: Record<NotifyLevel, ServerSettingDto['level']> = { all: 'All', mentions: 'MentionsOnly', nothing: 'Nothing' };
const LEVEL_FROM_DTO: Record<ServerSettingDto['level'], NotifyLevel> = { All: 'all', MentionsOnly: 'mentions', Nothing: 'nothing' };

export class HttpServerSettingsRepository implements ServerSettingsRepository {
  async list(): Promise<Record<string, ServerSettings>> {
    const list = await http<ServerSettingDto[]>('/notifications/servers');
    return Object.fromEntries(list.map((g) => [g.serverId, { level: LEVEL_FROM_DTO[g.level], mutedUntil: g.mutedUntil }]));
  }

  async save(serverId: string, settings: ServerSettings): Promise<void> {
    await http(`/notifications/servers/${serverId}`, { method: 'PUT', body: { level: LEVEL_TO_DTO[settings.level], mutedUntil: settings.mutedUntil } });
  }

  reset(serverId: string): Promise<void> {
    return http<void>(`/notifications/servers/${serverId}`, { method: 'DELETE' });
  }
}

/**
 * Đăng ký cách giải mã các sự kiện realtime của module Server
 * (tên sự kiện của SignalR hub → sự kiện trên EventBus).
 */
export function registerServerWire(): void {
  wire.onServerEvent<{ channel: ChannelDto }>('ChannelCreated', 'channel.created', ({ channel }) => ({ channel: toChannel(channel) }));
  wire.onServerEvent<{ channelId: string; serverId: string }>('ChannelRemoved', 'channel.removed');
  wire.onServerEvent<{ member: MemberProfileDto & { serverId: string } }>('MemberJoined', 'member.joined', ({ member }) => ({
    member: toMember({ ...member, serverId: member.serverId }),
  }));
  wire.onServerEvent<{ serverId: string; userId: string }>('MemberLeft', 'member.left');
  // Được thêm vào nhóm bởi người khác (hoặc admin hệ thống) → tải lại danh sách server.
  wire.onServerEvent<{ serverId: string }>('AddedToServer', 'server.added', ({ serverId }) => ({ serverId: serverId }));
  wire.onServerEvent<{ serverId: string; reason: string }>('RemovedFromServer', 'server.removed', ({ serverId, reason }) => ({
    serverId: serverId,
    reason,
  }));
  wire.onServerEvent<{ serverId: string }>('ServerDeleted', 'server.removed', ({ serverId }) => ({ serverId: serverId, reason: 'Deleted' }));
}
