import { describe, expect, it } from 'vitest';
import type { DirectChat } from './models';
import { blockedReason, sortChats, upsertChat } from './rules';

const chat = (id: string, last: string | null, extra: Partial<DirectChat> = {}): DirectChat => ({
  id,
  user: { id: `u-${id}`, displayName: `Người ${id}`, username: id, avatarUrl: '' },
  lastMessageAt: last,
  hasUnread: false,
  isFriend: true,
  ...extra,
});

describe('chat 1-1', () => {
  it('tin mới nhất lên trước, chưa có tin thì xuống cuối', () => {
    const sorted = sortChats([chat('a', '2026-01-01T00:00:00Z'), chat('b', null), chat('c', '2026-03-01T00:00:00Z')]);
    expect(sorted.map((c) => c.id)).toEqual(['c', 'a', 'b']);
  });

  it('upsert thay bản cũ, không nhân đôi, và sắp xếp lại', () => {
    const list = [chat('a', '2026-01-01T00:00:00Z'), chat('b', '2026-02-01T00:00:00Z')];
    const next = upsertChat(list, chat('a', '2026-05-01T00:00:00Z'));
    expect(next.map((c) => c.id)).toEqual(['a', 'b']);
    expect(upsertChat(next, chat('z', null))).toHaveLength(3);
  });

  it('hủy kết bạn thì hiện lý do chặn nhắn tin', () => {
    expect(blockedReason(chat('a', null))).toBeNull();
    expect(blockedReason(chat('a', null, { isFriend: false }))).toMatch(/không còn là bạn bè/);
  });
});
