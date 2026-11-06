import type { ChannelType, CreateChannelInput, CreateServerInput, NotifyLevel, Role, ServerSettings } from './models';

/**
 * Quy tắc phân quyền trong một server (giống Discord, backend là nơi kiểm tra cuối cùng):
 *  - Chủ server (owner): toàn quyền, kể cả tạo kênh (UC03).
 *  - Quản trị viên (moderator): ghim / xóa tin của người khác.
 *  - Thành viên: nhắn tin, mời bạn bè.
 */
export const permissions = {
  canCreateChannel: (role: Role | undefined) => role === 'owner',
  canModerate: (role: Role | undefined) => role === 'owner' || role === 'moderator',
  canInvite: (role: Role | undefined) => role !== undefined,
};

/** Tên kênh text: chữ thường, khoảng trắng → "-" (giữ dấu tiếng Việt). Kênh voice giữ nguyên. */
export function normalizeChannelName(name: string, type: ChannelType): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (type === 'voice') return trimmed;
  return trimmed
    .toLowerCase()
    .replace(/\s/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .replace(/-+/g, '-');
}

export function validateChannel(input: CreateChannelInput): string | null {
  const name = normalizeChannelName(input.name, input.type);
  if (name.length < 2) return 'Tên kênh cần ít nhất 2 ký tự';
  if (name.length > 40) return 'Tên kênh tối đa 40 ký tự';
  if (input.topic.length > 120) return 'Chủ đề tối đa 120 ký tự';
  return null;
}

export function validateServer(input: CreateServerInput): string | null {
  const name = input.name.trim();
  if (name.length < 2) return 'Tên server cần ít nhất 2 ký tự';
  if (name.length > 50) return 'Tên server tối đa 50 ký tự';
  if (input.description.length > 200) return 'Mô tả tối đa 200 ký tự';
  return null;
}

export function normalizeInviteCode(code: string): string {
  return code.trim().replace(/^.*\//, '').toUpperCase();
}

/* ---------- Cài đặt thông báo / tắt âm theo server ---------- */
export const defaultSettings: ServerSettings = { level: 'all', mutedUntil: null };

/** "Cho đến khi tôi bật lại" = một thời điểm rất xa. */
export const MUTE_FOREVER = '2099-12-31T00:00:00.000Z';

export const MUTE_OPTIONS: Array<{ id: string; label: string; minutes: number | 'forever' }> = [
  { id: '15m', label: 'Trong 15 phút', minutes: 15 },
  { id: '1h', label: 'Trong 1 giờ', minutes: 60 },
  { id: '3h', label: 'Trong 3 giờ', minutes: 180 },
  { id: '8h', label: 'Trong 8 giờ', minutes: 480 },
  { id: '24h', label: 'Trong 24 giờ', minutes: 1440 },
  { id: 'forever', label: 'Cho đến khi tôi bật lại', minutes: 'forever' },
];

export const NOTIFY_LEVELS: Array<{ id: NotifyLevel; label: string }> = [
  { id: 'all', label: 'Tất cả tin nhắn' },
  { id: 'mentions', label: 'Chỉ @mentions' },
  { id: 'nothing', label: 'Không có gì' },
];

export const levelLabel = (level: NotifyLevel) => NOTIFY_LEVELS.find((l) => l.id === level)?.label ?? '';

export const isMuted = (s: ServerSettings | undefined, now = Date.now()): boolean => !!s?.mutedUntil && Date.parse(s.mutedUntil) > now;

export const muteUntil = (minutes: number | 'forever', now = Date.now()): string =>
  minutes === 'forever' ? MUTE_FOREVER : new Date(now + minutes * 60_000).toISOString();

/** "đến 14:30" / "đến 14:30 ngày 22/10" / "cho đến khi bạn bật lại". */
export function describeMute(s: ServerSettings | undefined, now = Date.now()): string {
  if (!isMuted(s, now) || !s?.mutedUntil) return '';
  const d = new Date(s.mutedUntil);
  if (d.getFullYear() >= 2099) return 'cho đến khi bạn bật lại';
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return new Date(now).toDateString() === d.toDateString() ? `đến ${time}` : `đến ${time} ngày ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
}

/** Mặc định (không khác gì chưa đặt) thì không cần lưu dòng riêng trên server. */
export const isDefaultSettings = (s: ServerSettings) => s.level === 'all' && !s.mutedUntil;

/** Quy ước nhắc tên trong nội dung tin nhắn của backend: <@idNgườiDùng>. */
export const isMentioned = (content: string, userId: string | null) => !!userId && content.includes(`<@${userId}>`);

/** Có tính tin này vào số "chưa đọc" của server không. Được @nhắc tên vẫn tính khi chỉ tắt âm (như Discord). */
export function shouldCountUnread(s: ServerSettings | undefined, mentioned: boolean, now = Date.now()): boolean {
  if (s?.level === 'nothing') return false;
  if (isMuted(s, now) && !mentioned) return false;
  if (s?.level === 'mentions' && !mentioned) return false;
  return true;
}
