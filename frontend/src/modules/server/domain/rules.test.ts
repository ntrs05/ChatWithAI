import { describe, expect, it } from 'vitest';
import {
  defaultSettings,
  describeMute,
  isDefaultSettings,
  isMentioned,
  isMuted,
  muteUntil,
  normalizeChannelName,
  normalizeInviteCode,
  permissions,
  shouldCountUnread,
  validateChannel,
} from './rules';

describe('Phân quyền trong server', () => {
  it('chỉ chủ server được tạo kênh — UC03', () => {
    expect(permissions.canCreateChannel('owner')).toBe(true);
    expect(permissions.canCreateChannel('moderator')).toBe(false);
    expect(permissions.canCreateChannel('member')).toBe(false);
    expect(permissions.canCreateChannel(undefined)).toBe(false);
  });

  it('chủ server và quản trị viên được kiểm duyệt tin nhắn; thành viên thì không', () => {
    expect(permissions.canModerate('owner')).toBe(true);
    expect(permissions.canModerate('moderator')).toBe(true);
    expect(permissions.canModerate('member')).toBe(false);
    expect(permissions.canModerate(undefined)).toBe(false);
  });
});

describe('Tên kênh', () => {
  it('kênh text: chữ thường, khoảng trắng thành gạch nối, giữ dấu tiếng Việt', () => {
    expect(normalizeChannelName('  Thảo Luận  Chung! ', 'text')).toBe('thảo-luận-chung');
  });
  it('kênh voice giữ nguyên chữ hoa và khoảng trắng', () => {
    expect(normalizeChannelName('  Phòng   học nhóm ', 'voice')).toBe('Phòng học nhóm');
  });
  it('báo lỗi khi tên quá ngắn', () => {
    expect(validateChannel({ name: 'a', type: 'text', topic: '' })).toMatch(/ít nhất/);
    expect(validateChannel({ name: 'chung', type: 'text', topic: '' })).toBeNull();
  });
  it('mã mời chấp nhận cả đường link', () => {
    expect(normalizeInviteCode(' https://nebula.vn/invite/ktpm2026 ')).toBe('KTPM2026');
  });
});

describe('cài đặt thông báo theo server', () => {
  const now = Date.parse('2026-10-21T10:00:00Z');
  const muted = { level: 'all' as const, mutedUntil: muteUntil(60, now) };

  it('tắt âm có thời hạn rồi tự hết', () => {
    expect(isMuted(muted, now)).toBe(true);
    expect(isMuted(muted, now + 61 * 60_000)).toBe(false);
    expect(isMuted(defaultSettings, now)).toBe(false);
    expect(isMuted({ level: 'all', mutedUntil: muteUntil('forever', now) }, now + 10 * 365 * 86_400_000)).toBe(true);
  });

  it('chỉ tính chưa đọc khi đúng luật', () => {
    expect(shouldCountUnread(undefined, false, now)).toBe(true);
    expect(shouldCountUnread({ level: 'nothing', mutedUntil: null }, true, now)).toBe(false);
    expect(shouldCountUnread({ level: 'mentions', mutedUntil: null }, false, now)).toBe(false);
    expect(shouldCountUnread({ level: 'mentions', mutedUntil: null }, true, now)).toBe(true);
    expect(shouldCountUnread(muted, false, now)).toBe(false);
    expect(shouldCountUnread(muted, true, now)).toBe(true); // tắt âm vẫn báo khi được nhắc tên
  });

  it('nhận ra được nhắc tên và cài đặt mặc định', () => {
    expect(isMentioned('chào <@u1> nhé', 'u1')).toBe(true);
    expect(isMentioned('chào <@u2>', 'u1')).toBe(false);
    expect(isMentioned('chào', null)).toBe(false);
    expect(isDefaultSettings(defaultSettings)).toBe(true);
    expect(isDefaultSettings(muted)).toBe(false);
    expect(describeMute({ level: 'all', mutedUntil: muteUntil('forever', now) }, now)).toBe('cho đến khi bạn bật lại');
    expect(describeMute(defaultSettings, now)).toBe('');
  });
});
