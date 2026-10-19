import type { ChannelType, CreateChannelInput, CreateServerInput, Role } from './models';

/**
 * Quy tắc phân quyền theo Use Case:
 *  - Admin kế thừa mọi quyền của User (quan hệ generalization trong sơ đồ).
 *  - Chỉ Admin được "UC03: Tạo Kênh (Text / Voice)".
 */
export const permissions = {
  canCreateChannel: (role: Role | undefined) => role === 'admin',
  canInvite: (role: Role | undefined) => role === 'admin' || role === 'member',
};

/** Tên kênh text: chữ thường, khoảng trắng → "-" (giữ dấu tiếng Việt). Kênh voice giữ nguyên. */
export function normalizeChannelName(name: string, type: ChannelType): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (type === 'voice') return trimmed;
  return trimmed
    .toLowerCase()
    .replace(/\s/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .replace(/-+/g, '-');
}

export function validateChannel(input: CreateChannelInput): string | null {
  const name = normalizeChannelName(input.name, input.type);
  if (name.length < 2) return 'Tên kênh cần ít nhất 2 ký tự';
  if (name.length > 40) return 'Tên kênh tối đa 40 ký tự';
  if (input.topic.length > 120) return 'Chủ đề tối đa 120 ký tự';
  return null;
}

export function validateServer(input: CreateServerInput): string | null {
  const name = input.name.trim();
  if (name.length < 2) return 'Tên server cần ít nhất 2 ký tự';
  if (name.length > 50) return 'Tên server tối đa 50 ký tự';
  if (input.description.length > 200) return 'Mô tả tối đa 200 ký tự';
  return null;
}

export function normalizeInviteCode(code: string): string {
  return code.trim().replace(/^.*\//, '').toUpperCase();
}
