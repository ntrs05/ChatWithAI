import { ApiError, http, tokenStore } from '@/shared/http';
import { topics } from '@/shared/realtime';
import {
  mutate,
  readTable,
  requireMember,
  requireUser,
  respond,
  serverBroadcast,
  toPublicUser,
  type VoiceStateRow,
} from '@/mock-backend';
import type { VoicePresenceRepository } from '../application/ports';
import type { VoiceParticipant } from '../domain/models';

const STALE_MS = 35_000;

function toParticipant(row: VoiceStateRow): VoiceParticipant | null {
  const user = readTable('users').find((u) => u.id === row.userId);
  if (!user) return null;
  return {
    channelId: row.channelId,
    serverId: row.serverId,
    clientId: row.clientId,
    muted: row.muted,
    deafened: row.deafened,
    joinedAt: row.joinedAt,
    user: toPublicUser(user),
  };
}

/** Dọn các trạng thái "treo" (tab bị đóng đột ngột, không kịp gửi leave). */
function pruneStale() {
  const now = Date.now();
  const all = readTable('voiceStates');
  const stale = all.filter((v) => now - new Date(v.lastSeen).getTime() > STALE_MS);
  if (!stale.length) return;
  const key = (v: VoiceStateRow) => `${v.channelId}|${v.clientId}`;
  const staleKeys = new Set(stale.map(key));
  mutate('voiceStates', (rows) => rows.filter((r) => !staleKeys.has(key(r))));
  stale.forEach((v) =>
    serverBroadcast(topics.server(v.serverId), 'voice.participant.left', { channelId: v.channelId, serverId: v.serverId, clientId: v.clientId }),
  );
}

export class MockVoicePresenceRepository implements VoicePresenceRepository {
  listByServer(serverId: string): Promise<VoiceParticipant[]> {
    return respond(() => {
      requireMember(serverId, requireUser(tokenStore.get()).id);
      pruneStale();
      return readTable('voiceStates')
        .filter((v) => v.serverId === serverId)
        .map(toParticipant)
        .filter((p): p is VoiceParticipant => p !== null);
    });
  }

  join(channelId: string, state: { clientId: string; muted: boolean; deafened: boolean }): Promise<VoiceParticipant> {
    return respond(() => {
      const me = requireUser(tokenStore.get());
      const channel = readTable('channels').find((c) => c.id === channelId);
      if (!channel || channel.type !== 'voice') throw new ApiError('Không tìm thấy kênh thoại', 404);
      requireMember(channel.serverId, me.id);
      // Client này đang ở kênh khác → rời kênh đó
      readTable('voiceStates')
        .filter((v) => v.clientId === state.clientId)
        .forEach((v) => this.remove(v.channelId, v.clientId));
      const now = new Date().toISOString();
      const row: VoiceStateRow = { channelId, serverId: channel.serverId, userId: me.id, joinedAt: now, lastSeen: now, ...state };
      mutate('voiceStates', (rows) => [...rows, row]);
      const participant = toParticipant(row)!;
      serverBroadcast(topics.server(channel.serverId), 'voice.participant.joined', { participant });
      return participant;
    });
  }

  leave(channelId: string, clientId: string): Promise<void> {
    return respond(() => this.remove(channelId, clientId), [0, 10]);
  }

  update(channelId: string, clientId: string, patch: { muted: boolean; deafened: boolean }): Promise<void> {
    return respond(() => {
      let updated: VoiceStateRow | undefined;
      mutate('voiceStates', (rows) =>
        rows.map((r) => (r.channelId === channelId && r.clientId === clientId ? (updated = { ...r, ...patch }) : r)),
      );
      const participant = updated && toParticipant(updated);
      if (participant) serverBroadcast(topics.server(participant.serverId), 'voice.participant.updated', { participant });
    });
  }

  heartbeat(channelId: string, clientId: string): Promise<void> {
    return respond(() => {
      const now = new Date().toISOString();
      mutate('voiceStates', (rows) => rows.map((r) => (r.channelId === channelId && r.clientId === clientId ? { ...r, lastSeen: now } : r)));
    }, [0, 10]);
  }

  private remove(channelId: string, clientId: string) {
    const row = readTable('voiceStates').find((r) => r.channelId === channelId && r.clientId === clientId);
    if (!row) return;
    mutate('voiceStates', (rows) => rows.filter((r) => !(r.channelId === channelId && r.clientId === clientId)));
    serverBroadcast(topics.server(row.serverId), 'voice.participant.left', { channelId, serverId: row.serverId, clientId });
  }
}

export class HttpVoicePresenceRepository implements VoicePresenceRepository {
  listByServer = (serverId: string) => http<VoiceParticipant[]>(`/servers/${serverId}/voice-states`);
  join = (channelId: string, state: { clientId: string; muted: boolean; deafened: boolean }) =>
    http<VoiceParticipant>(`/voice/${channelId}/join`, { method: 'POST', body: state });
  leave = (channelId: string, clientId: string) =>
    http<void>(`/voice/${channelId}/leave`, { method: 'POST', body: { clientId }, keepalive: true });
  update = (channelId: string, clientId: string, patch: { muted: boolean; deafened: boolean }) =>
    http<void>(`/voice/${channelId}/state`, { method: 'PATCH', body: { clientId, ...patch } });
  /** Backend thật dựa vào sự kiện disconnect của Socket.IO nên không cần heartbeat. */
  heartbeat = async () => {};
}
