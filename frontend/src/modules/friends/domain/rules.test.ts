import { describe, expect, it } from 'vitest';
import type { Friend, FriendRequest, FriendUser } from './models';
import { isOnline, parseUserCode, relationOf, sortFriends, validateAddFriend } from './rules';

const user = (id: string, name: string, status = 'Offline'): FriendUser => ({ id, displayName: name, username: id, avatarUrl: '', status });
const friend = (u: FriendUser): Friend => ({ id: `f-${u.id}`, user: u, since: '2026-01-01T00:00:00Z' });
const request = (u: FriendUser): FriendRequest => ({ id: `r-${u.id}`, user: u, createdAt: '2026-01-01T00:00:00Z' });

describe('quy tắc bạn bè', () => {
  const lists = {
    friends: [friend(user('a', 'An'))],
    incoming: [request(user('b', 'Bình'))],
    outgoing: [request(user('c', 'Chi'))],
  };

  it('xác định quan hệ để chọn đúng nút', () => {
    expect(relationOf('me', 'me', lists)).toBe('self');
    expect(relationOf('a', 'me', lists)).toBe('friend');
    expect(relationOf('b', 'me', lists)).toBe('incoming');
    expect(relationOf('c', 'me', lists)).toBe('outgoing');
    expect(relationOf('z', 'me', lists)).toBe('none');
  });

  it('online xếp trước, cùng nhóm thì theo tên tiếng Việt', () => {
    const sorted = sortFriends([
      friend(user('1', 'Đức')),
      friend(user('2', 'Bình', 'Online')),
      friend(user('3', 'An')),
      friend(user('4', 'Chi', 'Idle')),
    ]);
    expect(sorted.map((f) => f.user.displayName)).toEqual(['Bình', 'Chi', 'An', 'Đức']);
    expect(isOnline(user('x', 'X', 'DoNotDisturb'))).toBe(true);
  });
});

describe('kết bạn bằng tên + ID', () => {
  it('ID là số 0–9999: chấp nhận "#", khoảng trắng, thiếu số 0 đầu', () => {
    expect(parseUserCode('0042')).toBe('0042');
    expect(parseUserCode('#0042')).toBe('0042');
    expect(parseUserCode(' 42 ')).toBe('0042');
    expect(parseUserCode('0')).toBe('0000');
    expect(parseUserCode('9999')).toBe('9999');
    expect(parseUserCode('10000')).toBeNull();
    expect(parseUserCode('abcd')).toBeNull();
    expect(parseUserCode('')).toBeNull();
  });

  it('phải có cả tên lẫn ID', () => {
    expect(validateAddFriend({ displayName: 'An', userCode: '#0042' })).toEqual({});
    expect(validateAddFriend({ displayName: '  ', userCode: '0042' }).displayName).toBeTruthy();
    expect(validateAddFriend({ displayName: 'An', userCode: '12345' }).userCode).toBeTruthy();
    expect(Object.keys(validateAddFriend({ displayName: '', userCode: '' }))).toEqual(['displayName', 'userCode']);
  });
});
