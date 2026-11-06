import type { UserProfile } from '@/shared/types';
import type { Channel, CreateChannelInput, CreateServerInput, Invitation, Member, Server, ServerSettings } from '../domain/models';

export interface ServerRepository {
  listMine(): Promise<Server[]>;
  listPublic(): Promise<Server[]>;
  create(input: CreateServerInput): Promise<Server>;
  joinByInvite(code: string): Promise<Server>;
  join(serverId: string): Promise<Server>;
  /** Rời khỏi server (chủ server phải giao quyền trước, server từ chối nếu không). */
  leave(serverId: string): Promise<void>;
  listChannels(serverId: string): Promise<Channel[]>;
  createChannel(serverId: string, input: CreateChannelInput): Promise<Channel>;
  /** Đổi kênh sang riêng tư / công khai (chỉ chủ server). */
  setChannelPrivacy(channel: Channel, isPrivate: boolean): Promise<Channel>;
  /** Người được vào một kênh riêng tư (chỉ chủ server xem được). */
  listChannelMembers(channelId: string): Promise<UserProfile[]>;
  addChannelMember(channelId: string, userId: string): Promise<void>;
  removeChannelMember(channelId: string, userId: string): Promise<void>;
  listMembers(serverId: string): Promise<Member[]>;
  /** Mời một người (thường là bạn bè) vào server; họ phải tự đồng ý. */
  invite(serverId: string, userId: string): Promise<void>;
  /** Lời mời vào server đang chờ mình trả lời. */
  listInvitations(): Promise<Invitation[]>;
  respondInvitation(invitationId: string, accept: boolean): Promise<void>;
}

/** Cài đặt thông báo / tắt âm của TỪNG server, lưu theo người dùng. */
export interface ServerSettingsRepository {
  list(): Promise<Record<string, ServerSettings>>;
  save(serverId: string, settings: ServerSettings): Promise<void>;
  /** Về mặc định (xóa dòng cài đặt). */
  reset(serverId: string): Promise<void>;
}
