import { fallbackAvatar } from '@/shared/assets';
import { http } from '@/shared/http';
import type { AdminRepository } from '../application/ports';
import type { AdminServer, AdminUser, AuditEntry, Quota } from '../domain/models';

interface UserDto {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  systemRole: string;
  isLocked: boolean;
  lockedReason: string | null;
  createdAt: string;
  lastSeenAt: string | null;
}

interface ServerDto {
  id: string;
  name: string;
  memberCount: number;
  ownerId: string;
  createdAt: string;
}

export class HttpAdminRepository implements AdminRepository {
  async listUsers(query: { q?: string; locked?: boolean }): Promise<AdminUser[]> {
    const list = await http<UserDto[]>('/admin/users', {
      query: { q: query.q, locked: query.locked === undefined ? undefined : String(query.locked) },
    });
    return list.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl || fallbackAvatar(u.id),
      isAdmin: u.systemRole === 'Admin',
      isLocked: u.isLocked,
      lockedReason: u.lockedReason,
      createdAt: u.createdAt,
      lastSeenAt: u.lastSeenAt,
    }));
  }

  lockUser = (id: string, reason: string) => http<void>(`/admin/users/${id}/lock`, { method: 'POST', body: { reason } });
  unlockUser = (id: string) => http<void>(`/admin/users/${id}/unlock`, { method: 'POST' });
  getQuota = (id: string) => http<Quota>(`/admin/users/${id}/quota`);
  setQuotaMb = (id: string, quotaMb: number) => http<void>(`/admin/users/${id}/quota`, { method: 'PUT', body: { quotaMb } });

  async listServers(q?: string): Promise<AdminServer[]> {
    const list = await http<ServerDto[]>('/admin/servers', { query: { q } });
    return list.map(({ id, name, memberCount, ownerId, createdAt }) => ({ id, name, memberCount, ownerId, createdAt }));
  }

  deleteServer = (id: string) => http<void>(`/servers/${id}`, { method: 'DELETE' });

  listAuditLogs = (query: { action?: string; skip: number; take: number }) =>
    http<AuditEntry[]>('/admin/audit-logs', { query }) as Promise<AuditEntry[]>;
}
