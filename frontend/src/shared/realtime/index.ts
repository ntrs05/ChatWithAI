export type { RealtimeEnvelope, RealtimeState, RealtimeTransport } from './RealtimeTransport';
export { RealtimeHub } from './RealtimeHub';
export { SignalRTransport } from './SignalRTransport';
export { wire } from './wire';

export const topics = {
  server: (serverId: string) => `server:${serverId}`,
  voice: (channelId: string) => `voice:${channelId}`,
};
