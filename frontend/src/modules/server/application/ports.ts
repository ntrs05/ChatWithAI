import type { Channel, CreateChannelInput, CreateServerInput, Member, Server } from '../domain/models';

export interface ServerRepository {
  listMine(): Promise<Server[]>;
  listPublic(): Promise<Server[]>;
  create(input: CreateServerInput): Promise<Server>;
  joinByInvite(code: string): Promise<Server>;
  join(serverId: string): Promise<Server>;
  listChannels(serverId: string): Promise<Channel[]>;
  createChannel(serverId: string, input: CreateChannelInput): Promise<Channel>;
  listMembers(serverId: string): Promise<Member[]>;
}
