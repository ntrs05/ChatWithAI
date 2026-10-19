import { describe, expect, it } from 'vitest';
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
