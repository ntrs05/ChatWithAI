import { describe, expect, it } from 'vitest';
import { normalizeChannelName, normalizeInviteCode, permissions, validateChannel } from './rules';

describe('Phân quyền (Admin kế thừa User)', () => {
  it('chỉ Admin được tạo kênh — UC03', () => {
    expect(permissions.canCreateChannel('admin')).toBe(true);
    expect(permissions.canCreateChannel('member')).toBe(false);
    expect(permissions.canCreateChannel(undefined)).toBe(false);
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
