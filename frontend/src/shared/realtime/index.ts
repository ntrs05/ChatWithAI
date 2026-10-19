export type { RealtimeEnvelope, RealtimeState, RealtimeTransport } from './RealtimeTransport';
export { RealtimeHub } from './RealtimeHub';
export { SocketIoTransport } from './SocketIoTransport';

export const topics = {
  server: (serverId: string) => `server:${serverId}`,
  voice: (channelId: string) => `voice:${channelId}`,
};
