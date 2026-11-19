import { formatDay } from '@/shared/lib';
import type { AppNotification, NotificationTarget } from './models';

/** Quy ước nhắc tên của backend: <@id>. Hiển thị thành chữ dễ đọc. */
const MENTION_RE = /<@[0-9a-fA-F-]{36}>/g;
export const cleanBody = (text: string) => text.replace(MENTION_RE, '@người-dùng').trim();

/** Tiêu đề + nội dung hiển thị: ưu tiên ghép tên người gây ra thông báo cho dễ hiểu. */
export function describe(n: AppNotification): { title: string; body: string } {
  const who = n.actor?.displayName;
  const body = cleanBody(n.body);
  if (who) {
    switch (n.type) {
      case 'Mention':
        return { title: `${who} đã nhắc đến bạn`, body };
      case 'DirectMessage':
        return { title: `${who} đã nhắn tin cho bạn`, body };
      case 'FriendRequest':
        return { title: `${who} gửi lời mời kết bạn`, body: 'Mở tab Bạn bè → Đang chờ để trả lời.' };
      case 'FriendAccepted':
        return { title: `${who} đã chấp nhận lời mời kết bạn`, body: 'Hai bạn giờ là bạn bè — bắt đầu trò chuyện nào!' };
      case 'JoinRequest':
        return { title: `${who} mời bạn vào một server`, body };
    }
  }
  return { title: n.title, body };
}

export function targetOf(n: AppNotification): NotificationTarget {
  switch (n.refType) {
    case 'Conversation':
      return { kind: 'conversation', id: n.refId };
    case 'Server':
      return { kind: 'server', id: n.refId };
    case 'JoinRequest':
      return { kind: 'invitations' };
    case 'Friend':
      return { kind: 'friends' };
    default:
      return { kind: 'none' };
  }
}

/** Chỉ bật toast cho tin "được nhắc tên" — các loại khác đã có chỉ báo riêng (chấm đỏ chat 1-1, huy hiệu bạn bè, lời mời ở Trang chủ). */
export const shouldToast = (n: AppNotification) => n.type === 'Mention';

/** Chèn thông báo mới lên đầu (thay bản cũ nếu trùng id), giữ thứ tự mới → cũ. */
export function upsertNotification(list: AppNotification[], n: AppNotification): AppNotification[] {
  const rest = list.filter((x) => x.id !== n.id);
  return [n, ...rest].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Gom theo ngày: "Hôm nay", "Hôm qua", "21/10/2026"… (danh sách đã sắp mới → cũ). */
export function groupByDay(list: AppNotification[]): Array<{ day: string; items: AppNotification[] }> {
  const groups: Array<{ day: string; items: AppNotification[] }> = [];
  for (const n of list) {
    const day = formatDay(n.createdAt);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(n);
    else groups.push({ day, items: [n] });
  }
  return groups;
}
