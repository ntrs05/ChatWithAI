import type { UserProfile } from '@/shared/types';
import type { Channel, CreateChannelInput, CreateServerInput, Invitation, Member, Server, ServerSettings } from '../domain/models';

export interface ServerRepository {
  listMine(): Promise<Server[]>;
  listPublic(): Promise<Server[]>;
  create(input: CreateServerInput): Promise<Server>;
  joinByInvite(code: string): Promise<Server>;
  join(serverId: string): Promise<Server>;
  leave(serverId: string): Promise<void>;
  listChannels(serverId: string): Promise<Channel[]>;
  createChannel(serverId: string, input: CreateChannelInput): Promise<Channel>;
  setChannelPrivacy(channel: Channel, isPrivate: boolean): Promise<Channel>;
  listChannelMembers(channelId: string): Promise<UserProfile[]>;
  addChannelMember(channelId: string, userId: string): Promise<void>;
  removeChannelMember(channelId: string, userId: string): Promise<void>;
  listMembers(serverId: string): Promise<Member[]>;
  invite(serverId: string, userId: string): Promise<void>;
  listInvitations(): Promise<Invitation[]>;
  respondInvitation(invitationId: string, accept: boolean): Promise<void>;
}

/** Cài đặt thông báo / tắt âm của TỪNG server, lưu theo người dùng. */
export interface ServerSettingsRepository {
  list(): Promise<Record<string, ServerSettings>>;
  save(serverId: string, settings: ServerSettings): Promise<void>;
  reset(serverId: string): Promise<void>;
}
