import { describe, expect, it } from 'vitest';
import { formatUserCode, parseUserCode, validatePasswordChange, validateProfile } from './User';

describe('ID công khai (0–9999)', () => {
  it('hiển thị "#0042", rỗng thì không hiển thị gì', () => {
    expect(formatUserCode('0042')).toBe('#0042');
    expect(formatUserCode('')).toBe('');
  });

  it('đọc lại từ chuỗi người dùng gõ, tự đệm số 0 cho đủ 4 chữ số', () => {
    expect(parseUserCode('0042')).toBe('0042');
    expect(parseUserCode('#0042')).toBe('0042');
    expect(parseUserCode('42')).toBe('0042');
    expect(parseUserCode('0')).toBe('0000');
    expect(parseUserCode('9999')).toBe('9999');
  });

  it('không phải 1–4 chữ số thì không hợp lệ', () => {
    expect(parseUserCode('')).toBeNull();
    expect(parseUserCode('abc')).toBeNull();
    expect(parseUserCode('10000')).toBeNull();
  });
});

describe('hồ sơ', () => {
  it('tên 2–32 ký tự, giới thiệu tối đa 300', () => {
    expect(validateProfile({ displayName: 'An', avatarUrl: '', bio: '' })).toEqual({});
    expect(validateProfile({ displayName: 'A', avatarUrl: '', bio: '' }).displayName).toBeTruthy();
    expect(validateProfile({ displayName: 'A'.repeat(33), avatarUrl: '', bio: '' }).displayName).toBeTruthy();
    expect(validateProfile({ displayName: 'An', avatarUrl: '', bio: 'x'.repeat(301) }).bio).toBeTruthy();
  });
});

describe('đổi mật khẩu', () => {
  const ok = { currentPassword: 'cu1234', newPassword: 'moi1234', confirmPassword: 'moi1234' };

  it('hợp lệ', () => {
    expect(validatePasswordChange(ok, true)).toEqual({});
  });

  it('phải nhập mật khẩu hiện tại (trừ tài khoản Google chưa có mật khẩu)', () => {
    expect(validatePasswordChange({ ...ok, currentPassword: '' }, true).currentPassword).toBeTruthy();
    expect(validatePasswordChange({ ...ok, currentPassword: '' }, false)).toEqual({});
  });

  it('mật khẩu mới ≥ 6 ký tự, khác mật khẩu cũ, nhập lại phải khớp', () => {
    expect(validatePasswordChange({ ...ok, newPassword: '123', confirmPassword: '123' }, true).newPassword).toBeTruthy();
    expect(validatePasswordChange({ ...ok, newPassword: 'cu1234', confirmPassword: 'cu1234' }, true).newPassword).toMatch(/khác/);
    expect(validatePasswordChange({ ...ok, confirmPassword: 'khac1234' }, true).confirmPassword).toBeTruthy();
  });
});
