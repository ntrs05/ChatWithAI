import type { AdminServer, AdminUser, AuditEntry, Quota } from '../domain/models';
import { parseQuotaMb } from '../domain/rules';
import type { AdminRepository } from './ports';

export const AUDIT_PAGE_SIZE = 50;

/** Các thao tác của admin hệ thống. Quyền thật do backend kiểm tra (policy "Admin"); lớp này chỉ kiểm tra dữ liệu nhập. */
export class AdminService {
  constructor(private readonly repo: AdminRepository) {}

  listUsers = (q?: string, locked?: boolean): Promise<AdminUser[]> => this.repo.listUsers({ q: q?.trim() || undefined, locked });

  async lockUser(id: string, reason: string): Promise<void> {
    const r = reason.trim();
    if (!r) throw new Error('Vui lòng nhập lý do khóa tài khoản.');
    await this.repo.lockUser(id, r);
  }

  unlockUser = (id: string): Promise<void> => this.repo.unlockUser(id);
  getQuota = (id: string): Promise<Quota> => this.repo.getQuota(id);

  async setQuota(id: string, mbText: string): Promise<void> {
    const mb = parseQuotaMb(mbText);
    if (mb === null) throw new Error('Hạn mức phải là số MB hợp lệ (0 trở lên).');
    await this.repo.setQuotaMb(id, mb);
  }

  listServers = (q?: string): Promise<AdminServer[]> => this.repo.listServers(q?.trim() || undefined);
  deleteServer = (id: string): Promise<void> => this.repo.deleteServer(id);

  listAuditLogs = (action: string | undefined, page: number): Promise<AuditEntry[]> =>
    this.repo.listAuditLogs({ action: action?.trim() || undefined, skip: page * AUDIT_PAGE_SIZE, take: AUDIT_PAGE_SIZE });
}
