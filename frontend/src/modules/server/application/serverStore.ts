import { create } from 'zustand';
import type { Channel, Invitation, Member, Role, Server, ServerSettings } from '../domain/models';

interface ServerState {
  meId: string | null;
  servers: Server[];
  serversLoaded: boolean;
  channels: Record<string, Channel[]>;
  members: Record<string, Member[]>;
  activeServerId: string | null;
  activeChannelId: string | null;
  /** Kênh xem gần nhất của mỗi server */
  lastChannel: Record<string, string>;
  /** Số tin chưa đọc theo kênh */
  unread: Record<string, { serverId: string; count: number }>;
  /** Cài đặt thông báo / tắt âm theo server (thiếu = mặc định). */
  settings: Record<string, ServerSettings>;
  /** Lời mời vào server đang chờ mình trả lời. */
  invitations: Invitation[];
}

const initial: ServerState = {
  meId: null,
  servers: [],
  serversLoaded: false,
  channels: {},
  members: {},
  activeServerId: null,
  activeChannelId: null,
  lastChannel: {},
  unread: {},
  settings: {},
  invitations: [],
};

export const useServerStore = create<ServerState>(() => ({ ...initial }));

export const resetServerStore = () => useServerStore.setState({ ...initial });

/* ---------- Selectors ---------- */
export const selectActiveServer = (s: ServerState) => s.servers.find((x) => x.id === s.activeServerId) ?? null;

export const selectActiveChannel = (s: ServerState): Channel | null => {
  if (!s.activeServerId || !s.activeChannelId) return null;
  return s.channels[s.activeServerId]?.find((c) => c.id === s.activeChannelId) ?? null;
};

export const selectMyRole = (serverId: string | null) => (s: ServerState): Role | undefined =>
  serverId ? s.members[serverId]?.find((m) => m.user.id === s.meId)?.role : undefined;

export const selectServerUnread = (serverId: string) => (s: ServerState) =>
  Object.values(s.unread).reduce((sum, u) => (u.serverId === serverId ? sum + u.count : sum), 0);

export const selectServerSettings = (serverId: string) => (s: ServerState): ServerSettings | undefined => s.settings[serverId];
