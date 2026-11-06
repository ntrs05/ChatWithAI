import { describe, expect, it } from 'vitest';
import type { AppNotification } from '@/modules/notifications';
import { pathForNotification } from './notificationNavigation';

const n = (refType: string, refId = 'x1'): AppNotification => ({ id: 'n', type: 'Mention', title: '', body: '', refType, refId, actor: null, createdAt: '', isRead: false });
const ctx = { directIds: new Set(['dm1']), serverOfChannel: (id: string) => (id === 'ch1' ? 's1' : null) };

describe('bấm vào thông báo thì mở đâu', () => {
  it('chat 1-1 → /app/dm/…', () => expect(pathForNotification(n('Conversation', 'dm1'), ctx)).toBe('/app/dm/dm1'));
  it('kênh server → /app/<server>/<kênh>', () => expect(pathForNotification(n('Conversation', 'ch1'), ctx)).toBe('/app/s1/ch1'));
  it('kênh chưa biết thuộc server nào → null (để người gọi tải rồi thử lại)', () => expect(pathForNotification(n('Conversation', 'lạ'), ctx)).toBeNull());
  it('nhóm → /app/<nhóm>', () => expect(pathForNotification(n('Server', 'g9'), ctx)).toBe('/app/g9'));
  it('lời mời vào server → Trang chủ; kết bạn → Bạn bè; loại lạ → trang Thông báo', () => {
    expect(pathForNotification(n('JoinRequest'), ctx)).toBe('/app');
    expect(pathForNotification(n('Friend'), ctx)).toBe('/app/friends');
    expect(pathForNotification(n('???'), ctx)).toBe('/app/notifications');
  });
});
