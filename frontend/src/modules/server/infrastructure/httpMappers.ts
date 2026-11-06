import { fallbackAvatar, fallbackServerIcon } from '@/shared/assets';
import type { Channel, Member, Role, Server } from '../domain/models';

/**
 * Dạng JSON backend Nebula trả về (xem ServerSummaryDto / ServerDetailDto / ChannelDto / MemberProfileDto bên .NET)
 * và hàm đổi sang model của domain.
 */
export interface ServerDto {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  joinPolicy: 'InviteOnly' | 'RequestToJoin' | 'Open';
  inviteCode: string | null;
  createdAt: string;
  /** ServerSummaryDto: id chủ server. */
  ownerId?: string;
  /** ServerDetailDto: id người tạo nhóm. */
  createdBy?: string;
  memberCount?: number;
  members?: unknown[];
}

export interface ChannelDto {
  id: string;
  serverId: string;
  categoryId: string | null;
  name: string;
  topic: string | null;
  kind: 'Text' | 'Voice';
  position: number;
  createdAt: string;
  isPrivate?: boolean;
}

export interface CategoryDto {
  id: string;
  name: string;
  position: number;
  channels: ChannelDto[];
}

export interface ServerChannelsDto {
  serverId: string;
  categories: CategoryDto[];
  uncategorized: ChannelDto[];
}

export interface MemberProfileDto {
  serverId: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  role: 'Owner' | 'Moderator' | 'Member';
  joinedAt: string;
}

/** Owner → "owner" (tạo / quản lý kênh), Moderator → "moderator" (kiểm duyệt tin), còn lại → "member". */
export const toRole = (role: string | null | undefined): Role => (role === 'Owner' ? 'owner' : role === 'Moderator' ? 'moderator' : 'member');

export function toServer(g: ServerDto): Server {
  return {
    id: g.id,
    name: g.name,
    iconUrl: g.avatarUrl || fallbackServerIcon(g.id),
    description: g.description ?? '',
    ownerId: g.ownerId ?? g.createdBy ?? '',
    inviteCode: g.inviteCode ?? '',
    isPublic: g.joinPolicy === 'Open',
    createdAt: g.createdAt,
    memberCount: g.memberCount ?? g.members?.length,
  };
}

export function toChannel(c: ChannelDto): Channel {
  return {
    id: c.id,
    serverId: c.serverId,
    name: c.name,
    type: c.kind === 'Voice' ? 'voice' : 'text',
    topic: c.topic ?? '',
    position: c.position,
    createdAt: c.createdAt,
    isPrivate: c.isPrivate ?? false,
  };
}

/** Làm phẳng category → danh sách kênh theo thứ tự hiển thị (category trước, kênh lẻ sau). */
export function flattenChannels(dto: ServerChannelsDto): Channel[] {
  const ordered = [...dto.categories.flatMap((c) => c.channels), ...dto.uncategorized];
  return ordered.map((c, index) => ({ ...toChannel(c), position: index }));
}

export function toMember(m: MemberProfileDto): Member {
  return {
    serverId: m.serverId,
    role: toRole(m.role),
    joinedAt: m.joinedAt,
    user: {
      id: m.userId,
      displayName: m.displayName,
      username: m.username,
      avatarUrl: m.avatarUrl || fallbackAvatar(m.userId),
    },
  };
}
