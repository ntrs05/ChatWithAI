import { http } from '@/shared/http';
import type { ServerRepository } from '../application/ports';
import type { Channel, CreateChannelInput, CreateServerInput, Member, Server } from '../domain/models';

export class HttpServerRepository implements ServerRepository {
  listMine = () => http<Server[]>('/servers');
  listPublic = () => http<Server[]>('/servers/public');
  create = (input: CreateServerInput) => http<Server>('/servers', { method: 'POST', body: input });
  joinByInvite = (inviteCode: string) => http<Server>('/servers/join', { method: 'POST', body: { inviteCode } });
  join = (serverId: string) => http<Server>(`/servers/${serverId}/join`, { method: 'POST' });
  listChannels = (serverId: string) => http<Channel[]>(`/servers/${serverId}/channels`);
  createChannel = (serverId: string, input: CreateChannelInput) =>
    http<Channel>(`/servers/${serverId}/channels`, { method: 'POST', body: input });
  listMembers = (serverId: string) => http<Member[]>(`/servers/${serverId}/members`);
}
