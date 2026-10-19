import { ApiError } from '@/shared/http';
import type { Tables, UserRow } from './schema';

const PREFIX = 'nebula.db.v1.';

export function readTable<K extends keyof Tables>(name: K): Tables[K][] {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + name) ?? '[]') as Tables[K][];
  } catch {
    return [];
  }
}

export function writeTable<K extends keyof Tables>(name: K, rows: Tables[K][]): void {
  try {
    localStorage.setItem(PREFIX + name, JSON.stringify(rows));
  } catch {
    throw new ApiError('Bộ nhớ trình duyệt đã đầy (localStorage)', 507);
  }
}

/** Đọc → sửa → ghi một bảng. */
export function mutate<K extends keyof Tables>(name: K, fn: (rows: Tables[K][]) => Tables[K][]): Tables[K][] {
  const next = fn(readTable(name));
  writeTable(name, next);
  return next;
}

export function isSeeded(): boolean {
  return localStorage.getItem(PREFIX + 'seeded') === '1';
}

export function markSeeded(): void {
  localStorage.setItem(PREFIX + 'seeded', '1');
}

export function resetDatabase(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}

/**
 * Mô phỏng một lời gọi API: thực thi NGAY (đồng bộ — để vẫn chạy được trong
 * `beforeunload`), rồi trả kết quả sau một độ trễ mạng ngẫu nhiên.
 */
export function respond<T>(handler: () => T, latency: [number, number] = [60, 180]): Promise<T> {
  let result: T;
  try {
    result = handler();
  } catch (err) {
    return new Promise((_, reject) => setTimeout(() => reject(err), latency[0]));
  }
  const ms = latency[0] + Math.random() * (latency[1] - latency[0]);
  return new Promise((resolve) => setTimeout(() => resolve(result), ms));
}

/** Xác thực token giống middleware `requireAuth` của server. */
export function requireUser(token: string | null): UserRow {
  if (!token) throw new ApiError('Bạn chưa đăng nhập', 401);
  const session = readTable('sessions').find((s) => s.token === token);
  const user = session && readTable('users').find((u) => u.id === session.userId);
  if (!user) throw new ApiError('Phiên đăng nhập đã hết hạn', 401);
  return user;
}

export function requireMember(serverId: string, userId: string) {
  const member = readTable('members').find((m) => m.serverId === serverId && m.userId === userId);
  if (!member) throw new ApiError('Bạn không phải thành viên của server này', 403);
  return member;
}

export function toPublicUser(u: UserRow) {
  return { id: u.id, displayName: u.displayName, username: u.username, avatarUrl: u.avatarUrl };
}

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
