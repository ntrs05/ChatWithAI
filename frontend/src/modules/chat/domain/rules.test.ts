import { describe, expect, it } from 'vitest';
import { messageActions, stripMentions, toggleReaction, validateEdit } from './rules';
import type { Message } from './models';
import { mergeMessages, startsGroup, validateOutgoing } from './rules';

const author = { id: 'u1', displayName: 'An', username: 'an', avatarUrl: '' };
const msg = (id: string, minute: number, extra: Partial<Message> = {}): Message => ({
  id,
  channelId: 'c1',
  serverId: 's1',
  author,
  content: id,
  attachments: [],
  createdAt: new Date(2026, 0, 1, 10, minute).toISOString(),
  ...extra,
});

describe('mergeMessages', () => {
  it('thay tin nhắn "lạc quan" bằng bản từ server theo nonce (không bị trùng)', () => {
    const optimistic = msg('local-1', 1, { nonce: 'n1', status: 'sending' });
    const fromServer = msg('m-99', 1, { nonce: 'n1' });
    const merged = mergeMessages([optimistic], [fromServer]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('m-99');
    expect(merged[0].status).toBeUndefined();
  });

  it('nhận cùng một tin 2 lần (HTTP + realtime) vẫn chỉ hiển thị 1', () => {
    const m = msg('m1', 1);
    expect(mergeMessages(mergeMessages([], [m]), [m])).toHaveLength(1);
  });

  it('luôn sắp theo thời gian khi chèn lịch sử cũ', () => {
    const merged = mergeMessages([msg('b', 5)], [msg('a', 1)]);
    expect(merged.map((m) => m.id)).toEqual(['a', 'b']);
  });
});

describe('startsGroup', () => {
  it('gộp tin liên tiếp của cùng người trong 5 phút', () => {
    expect(startsGroup(msg('a', 0), msg('b', 3))).toBe(false);
    expect(startsGroup(msg('a', 0), msg('b', 9))).toBe(true);
  });
});

describe('validateOutgoing', () => {
  it('không cho gửi tin trống', () => {
    expect(validateOutgoing('   ', 0)).not.toBeNull();
    expect(validateOutgoing('', 1)).toBeNull();
  });
});

describe('cảm xúc tin nhắn', () => {
  it('thả lần 1, gỡ lần 2; nhiều người cùng một cảm xúc thì cộng dồn', () => {
    const a = toggleReaction(undefined, '👍', 'u1');
    expect(a).toEqual([{ emoji: '👍', count: 1, userIds: ['u1'] }]);
    const b = toggleReaction(a, '👍', 'u2');
    expect(b[0]).toMatchObject({ count: 2, userIds: ['u1', 'u2'] });
    const c = toggleReaction(b, '👍', 'u1');
    expect(c[0]).toMatchObject({ count: 1, userIds: ['u2'] });
    expect(toggleReaction(c, '👍', 'u2')).toEqual([]); // hết người thả thì mất hẳn loại cảm xúc đó
  });

  it('không sửa mảng gốc (immutable) và giữ các cảm xúc khác', () => {
    const base = [{ emoji: '❤️', count: 1, userIds: ['u9'] }];
    const next = toggleReaction(base, '😂', 'u1');
    expect(base).toHaveLength(1);
    expect(next.map((r) => r.emoji)).toEqual(['❤️', '😂']);
  });
});

describe('thao tác trên tin nhắn', () => {
  const msg = (over: Partial<Message> = {}): Message => ({
    id: 'm1', channelId: 'c', serverId: 's', author: { id: 'me', displayName: 'Tôi', username: 'me', avatarUrl: '' }, content: 'hi', attachments: [], createdAt: '', ...over,
  });
  const none = { canPin: false, canDeleteOthers: false };

  it('thành viên thường: sửa/xóa tin của mình, không ghim, không xóa tin người khác', () => {
    expect(messageActions(msg(), 'me', none)).toEqual({ react: true, edit: true, pin: false, remove: true });
    expect(messageActions(msg({ author: { id: 'other', displayName: '', username: '', avatarUrl: '' } }), 'me', none)).toEqual({ react: true, edit: false, pin: false, remove: false });
  });

  it('chủ server: ghim + xóa tin người khác nhưng vẫn không sửa tin người khác', () => {
    const a = messageActions(msg({ author: { id: 'other', displayName: '', username: '', avatarUrl: '' } }), 'me', { canPin: true, canDeleteOthers: true });
    expect(a).toEqual({ react: true, edit: false, pin: true, remove: true });
  });

  it('tin đã xóa / đang gửi / gửi lỗi: không có thao tác nào', () => {
    const all = { canPin: true, canDeleteOthers: true };
    const off = { react: false, edit: false, pin: false, remove: false };
    expect(messageActions(msg({ deleted: true }), 'me', all)).toEqual(off);
    expect(messageActions(msg({ status: 'sending' }), 'me', all)).toEqual(off);
    expect(messageActions(msg({ status: 'failed' }), 'me', all)).toEqual(off);
    expect(messageActions(msg({ id: 'local-1' }), 'me', all)).toEqual(off);
  });
});

describe('sửa tin & lời nhắc tên', () => {
  it('sửa: không rỗng, không quá dài', () => {
    expect(validateEdit('ok')).toBeNull();
    expect(validateEdit('   ')).toBeTruthy();
    expect(validateEdit('x'.repeat(2001))).toBeTruthy();
  });

  it('<@guid> được đổi thành chữ dễ đọc', () => {
    expect(stripMentions('chào <@0195a1b2-1111-7222-8333-444455556666> nhé')).toBe('chào @người-dùng nhé');
    expect(stripMentions('không có gì')).toBe('không có gì');
  });
});
