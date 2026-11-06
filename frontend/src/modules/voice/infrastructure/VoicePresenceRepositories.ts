import { fallbackAvatar } from '@/shared/assets';
import { http } from '@/shared/http';
import { wire } from '@/shared/realtime';
import type { VoicePresenceRepository } from '../application/ports';
import type { VoiceParticipant } from '../domain/models';

/* ---------- Backend Nebula (REST + SignalR) ---------- */

/** VoiceParticipantDto bên .NET. */
interface ParticipantDto {
  channelId: string;
  serverId: string;
  user: { id: string; displayName: string; username: string; avatarUrl: string | null };
  clientId: string;
  muted: boolean;
  deafened: boolean;
  joinedAt: string;
}

const toParticipantFromDto = (d: ParticipantDto): VoiceParticipant => ({
  channelId: d.channelId,
  serverId: d.serverId,
  clientId: d.clientId,
  muted: d.muted,
  deafened: d.deafened,
  joinedAt: d.joinedAt,
  user: { ...d.user, avatarUrl: d.user.avatarUrl || fallbackAvatar(d.user.id) },
});

export class HttpVoicePresenceRepository implements VoicePresenceRepository {
  listByServer = async (serverId: string) =>
    (await http<ParticipantDto[]>(`/servers/${serverId}/voice-states`)).map(toParticipantFromDto);

  join = async (channelId: string, state: { clientId: string; muted: boolean; deafened: boolean }) =>
    toParticipantFromDto(await http<ParticipantDto>(`/channels/${channelId}/voice/join`, { method: 'POST', body: state }));

  /** keepalive: vẫn gửi được khi đóng tab (beforeunload). */
  leave = (channelId: string, clientId: string) =>
    http<void>(`/channels/${channelId}/voice/leave`, { method: 'POST', body: { clientId }, keepalive: true });

  update = (channelId: string, clientId: string, patch: { muted: boolean; deafened: boolean }) =>
    http<void>(`/channels/${channelId}/voice/state`, { method: 'PUT', body: { clientId, ...patch } });

  /** Backend tự dọn trạng thái khi SignalR mất kết nối nên không cần heartbeat. */
  heartbeat = async () => {};
}

/** Sự kiện realtime của module Voice: ai vào/ra/đổi mic và tín hiệu WebRTC. */
export function registerVoiceWire(): void {
  wire.onServerEvent<{ participant: ParticipantDto }>('VoiceJoined', 'voice.participant.joined', ({ participant }) => ({
    participant: toParticipantFromDto(participant),
  }));
  wire.onServerEvent<{ participant: ParticipantDto }>('VoiceUpdated', 'voice.participant.updated', ({ participant }) => ({
    participant: toParticipantFromDto(participant),
  }));
  wire.onServerEvent('VoiceLeft', 'voice.participant.left');
  // Tín hiệu WebRTC có cùng dạng SignalEnvelope ở hai đầu: {channelId, from, to?, data}.
  wire.onServerEvent('VoiceSignal', 'voice.signal');
  wire.onClientEvent('voice.signal', (env) => ({ method: 'VoiceSignal', args: [env.payload] }));
}
