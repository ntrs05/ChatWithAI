import type { Channel, Member, Server } from './domain/models';

declare module '@/shared/event-bus/events' {
  interface AppEvents {
    'server.listLoaded': { serverIds: string[] };
    'server.joined': { server: Server };
    'channel.selected': { serverId: string; channel: Channel };
    'channel.created': { channel: Channel };
    'channel.removed': { channelId: string; serverId: string };
    'member.joined': { member: Member };
    'member.left': { serverId: string; userId: string };
    'server.markedRead': { serverId: string; channelIds: string[] };
    'server.added': { serverId: string };
    'server.removed': { serverId: string; reason: string };
  }
}

export {};
