import type { AdminServer, AdminUser, AuditEntry, Quota } from '../domain/models';

export interface AdminRepository {
  listUsers(query: { q?: string; locked?: boolean }): Promise<AdminUser[]>;
  lockUser(id: string, reason: string): Promise<void>;
  unlockUser(id: string): Promise<void>;
  getQuota(id: string): Promise<Quota>;
  setQuotaMb(id: string, quotaMb: number): Promise<void>;
  listServers(q?: string): Promise<AdminServer[]>;
  deleteServer(id: string): Promise<void>;
  listAuditLogs(query: { action?: string; skip: number; take: number }): Promise<AuditEntry[]>;
}
