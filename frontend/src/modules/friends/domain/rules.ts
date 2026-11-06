import type { Friend, FriendRequest, FriendUser, Relation } from './models';

export const isOnline = (user: FriendUser) => user.status !== 'Offline';

/** Quan hệ của mình với `userId` dựa trên danh sách hiện có. */
export function relationOf(
  userId: string,
  meId: string | null,
  lists: { friends: Friend[]; incoming: FriendRequest[]; outgoing: FriendRequest[] },
): Relation {
  if (userId === meId) return 'self';
  if (lists.friends.some((f) => f.user.id === userId)) return 'friend';
  if (lists.incoming.some((r) => r.user.id === userId)) return 'incoming';
  if (lists.outgoing.some((r) => r.user.id === userId)) return 'outgoing';
  return 'none';
}

/** Online lên trước, sau đó theo tên (có dấu tiếng Việt). */
export function sortFriends(friends: Friend[]): Friend[] {
  return [...friends].sort(
    (a, b) => Number(isOnline(b.user)) - Number(isOnline(a.user)) || a.user.displayName.localeCompare(b.user.displayName, 'vi'),
  );
}

/* ---------- Kết bạn bằng TÊN + ID ---------- */

export interface AddFriendInput {
  displayName: string;
  userCode: string;
}

/** Lấy ID từ chuỗi người dùng gõ ("0042", "#0042", "42"): 1–4 chữ số (0–9999), tự đệm số 0 cho đủ 4; ngoài ra → null. */
export function parseUserCode(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  return digits.length >= 1 && digits.length <= 4 ? digits.padStart(4, '0') : null;
}

/** Phải có CẢ tên lẫn ID hợp lệ mới gửi được lời mời. */
export function validateAddFriend(input: AddFriendInput): Partial<Record<keyof AddFriendInput, string>> {
  const errors: Partial<Record<keyof AddFriendInput, string>> = {};
  if (input.displayName.trim().length < 1) errors.displayName = 'Nhập tên hiển thị của người đó';
  if (!parseUserCode(input.userCode)) errors.userCode = 'ID là số từ 0 đến 9999';
  return errors;
}
