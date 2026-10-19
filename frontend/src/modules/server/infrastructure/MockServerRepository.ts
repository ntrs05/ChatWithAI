import { ApiError, tokenStore } from '@/shared/http';
import { uid } from '@/shared/lib';
import { topics } from '@/shared/realtime';
import {
  mutate,
  readTable,
  requireMember,
  requireUser,
  respond,
  serverBroadcast,
  toPublicUser,
  type ChannelRow,
  type MemberRow,
  type ServerRow,
} from '@/mock-backend';
import type { ServerRepository } from '../application/ports';
import type { Channel, CreateChannelInput, CreateServerInput, Member, Server } from '../domain/models';

const toServer = (s: ServerRow): Server => ({
  ...s,
  memberCount: readTable('members').filter((m) => m.serverId === s.id).length,
});
const toChannel = (c: ChannelRow): Channel => ({ ...c });
const toMember = (m: MemberRow): Member | null => {
  const user = readTable('users').find((u) => u.id === m.userId);
  return user ? { serverId: m.serverId, role: m.role, joinedAt: m.joinedAt, user: toPublicUser(user) } : null;
};

function randomInvite(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** Mô phỏng các endpoint /servers, /channels của backend. */
export class MockServerRepository implements ServerRepository {
  listMine(): Promise<Server[]> {
    return respond(() => {
      const me = requireUser(tokenStore.get());
      const myIds = new Set(readTable('members').filter((m) => m.userId === me.id).map((m) => m.serverId));
      return readTable('servers').filter((s) => myIds.has(s.id)).map(toServer);
    });
  }

  listPublic(): Promise<Server[]> {
    return respond(() => {
      requireUser(tokenStore.get());
      return readTable('servers').filter((s) => s.isPublic).map(toServer);
    });
  }

  create(input: CreateServerInput): Promise<Server> {
    return respond(() => {
      const me = requireUser(tokenStore.get());
      const now = new Date().toISOString();
      const server: ServerRow = { id: uid('s'), ownerId: me.id, inviteCode: randomInvite(), createdAt: now, ...input };
      const defaults: ChannelRow[] = [
        { id: uid('ch'), serverId: server.id, name: 'chung', type: 'text', topic: 'Kênh trò chuyện chung', position: 0, createdAt: now },
        { id: uid('ch'), serverId: server.id, name: 'Phòng thoại', type: 'voice', topic: '', position: 1, createdAt: now },
      ];
      mutate('servers', (rows) => [...rows, server]);
      mutate('channels', (rows) => [...rows, ...defaults]);
      // Người tạo server trở thành Admin
      mutate('members', (rows) => [...rows, { serverId: server.id, userId: me.id, role: 'admin', joinedAt: now }]);
      return toServer(server);
    }, [300, 500]);
  }

  joinByInvite(code: string): Promise<Server> {
    return respond(() => {
      const server = readTable('servers').find((s) => s.inviteCode.toUpperCase() === code.toUpperCase());
      if (!server) throw new ApiError('Mã mời không hợp lệ hoặc đã hết hạn', 404);
      return this.addMember(server);
    }, [250, 450]);
  }

  join(serverId: string): Promise<Server> {
    return respond(() => {
      const server = readTable('servers').find((s) => s.id === serverId);
      if (!server) throw new ApiError('Không tìm thấy server', 404);
      if (!server.isPublic) throw new ApiError('Server này chỉ tham gia được bằng mã mời', 403);
      return this.addMember(server);
    }, [250, 450]);
  }

  listChannels(serverId: string): Promise<Channel[]> {
    return respond(() => {
      requireMember(serverId, requireUser(tokenStore.get()).id);
      return readTable('channels')
        .filter((c) => c.serverId === serverId)
        .sort((a, b) => a.position - b.position)
        .map(toChannel);
    });
  }

  createChannel(serverId: string, input: CreateChannelInput): Promise<Channel> {
    return respond(() => {
      const me = requireUser(tokenStore.get());
      const member = requireMember(serverId, me.id);
      // Server luôn tự kiểm tra quyền — không tin tưởng client
      if (member.role !== 'admin') throw new ApiError('Chỉ quản trị viên mới được tạo kênh', 403);
      const siblings = readTable('channels').filter((c) => c.serverId === serverId);
      if (siblings.some((c) => c.type === input.type && c.name === input.name)) {
        throw new ApiError('Đã có kênh cùng tên', 409);
      }
      const channel: ChannelRow = {
        id: uid('ch'),
        serverId,
        name: input.name,
        type: input.type,
        topic: input.topic,
        position: Math.max(-1, ...siblings.map((c) => c.position)) + 1,
        createdAt: new Date().toISOString(),
      };
      mutate('channels', (rows) => [...rows, channel]);
      serverBroadcast(topics.server(serverId), 'channel.created', { channel: toChannel(channel) });
      return toChannel(channel);
    });
  }

  listMembers(serverId: string): Promise<Member[]> {
    return respond(() => {
      requireMember(serverId, requireUser(tokenStore.get()).id);
      return readTable('members')
        .filter((m) => m.serverId === serverId)
        .map(toMember)
        .filter((m): m is Member => m !== null);
    });
  }

  private addMember(server: ServerRow): Server {
    const me = requireUser(tokenStore.get());
    const exists = readTable('members').some((m) => m.serverId === server.id && m.userId === me.id);
    if (!exists) {
      const row: MemberRow = { serverId: server.id, userId: me.id, role: 'member', joinedAt: new Date().toISOString() };
      mutate('members', (rows) => [...rows, row]);
      serverBroadcast(topics.server(server.id), 'member.joined', { member: toMember(row) });
    }
    return toServer(server);
  }
}
