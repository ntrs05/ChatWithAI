import { describe as suite, expect, it } from 'vitest';
import type { AppNotification } from './models';
import { cleanBody, describe, groupByDay, shouldToast, targetOf, upsertNotification } from './rules';

const make = (over: Partial<AppNotification> = {}): AppNotification => ({
  id: 'n1', type: 'Mention', title: 'Bạn được nhắc đến', body: 'chào <@0195a1b2-1111-7222-8333-444455556666> nhé', refType: 'Conversation', refId: 'c1',
  actor: { id: 'u2', displayName: 'Minh', username: 'minh', avatarUrl: '' }, createdAt: '2026-10-21T10:00:00Z', isRead: false, ...over,
});

suite('thông báo', () => {
  it('lời nhắc tên <@id> được đổi thành chữ dễ đọc', () => {
    expect(cleanBody('chào <@0195a1b2-1111-7222-8333-444455556666> nhé')).toBe('chào @người-dùng nhé');
  });

  it('ghép tên người gây ra thông báo vào tiêu đề', () => {
    expect(describe(make()).title).toBe('Minh đã nhắc đến bạn');
    expect(describe(make({ type: 'DirectMessage' })).title).toBe('Minh đã nhắn tin cho bạn');
    expect(describe(make({ type: 'FriendRequest', refType: 'Friend' })).title).toBe('Minh gửi lời mời kết bạn');
    expect(describe(make({ type: 'FriendAccepted' })).title).toBe('Minh đã chấp nhận lời mời kết bạn');
    expect(describe(make({ type: 'JoinRequest', body: 'Nhóm "CLB"' })).body).toBe('Nhóm "CLB"');
  });

  it('không có người gây ra (hệ thống) hoặc loại khác thì dùng tiêu đề từ server', () => {
    expect(describe(make({ actor: null })).title).toBe('Bạn được nhắc đến');
    expect(describe(make({ type: 'RoleChanged', title: 'Chức vụ của bạn thay đổi' })).title).toBe('Chức vụ của bạn thay đổi');
  });

  it('đích đến theo loại tham chiếu', () => {
    expect(targetOf(make())).toEqual({ kind: 'conversation', id: 'c1' });
    expect(targetOf(make({ refType: 'Server', refId: 'g1' }))).toEqual({ kind: 'server', id: 'g1' });
    expect(targetOf(make({ refType: 'JoinRequest' }))).toEqual({ kind: 'invitations' });
    expect(targetOf(make({ refType: 'Friend' }))).toEqual({ kind: 'friends' });
    expect(targetOf(make({ refType: 'Lạ' }))).toEqual({ kind: 'none' });
  });

  it('chỉ toast khi được nhắc tên', () => {
    expect(shouldToast(make())).toBe(true);
    expect(shouldToast(make({ type: 'DirectMessage' }))).toBe(false);
  });

  it('thông báo mới lên đầu, trùng id thì thay thế', () => {
    const old = make({ id: 'a', createdAt: '2026-10-20T00:00:00Z' });
    const mid = make({ id: 'b', createdAt: '2026-10-21T00:00:00Z' });
    const list = upsertNotification([mid, old], make({ id: 'c', createdAt: '2026-10-22T00:00:00Z' }));
    expect(list.map((n) => n.id)).toEqual(['c', 'b', 'a']);
    expect(upsertNotification(list, make({ id: 'b', isRead: true, createdAt: '2026-10-21T00:00:00Z' })).filter((n) => n.id === 'b')).toHaveLength(1);
  });

  it('gom theo ngày, giữ thứ tự', () => {
    const groups = groupByDay([make({ id: '1', createdAt: '2026-01-05T09:00:00' }), make({ id: '2', createdAt: '2026-01-05T08:00:00' }), make({ id: '3', createdAt: '2026-01-04T08:00:00' })]);
    expect(groups).toHaveLength(2);
    expect(groups[0].items.map((n) => n.id)).toEqual(['1', '2']);
  });
});
