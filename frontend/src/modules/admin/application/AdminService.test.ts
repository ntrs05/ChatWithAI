import { describe, expect, it, vi } from 'vitest';
import { AdminService } from './AdminService';
import type { AdminRepository } from './ports';

const repo = (): AdminRepository => ({
  listUsers: vi.fn(async () => []), lockUser: vi.fn(async () => {}), unlockUser: vi.fn(async () => {}),
  getQuota: vi.fn(async () => ({ usedBytes: 0, limitBytes: 0 })), setQuotaMb: vi.fn(async () => {}),
  listServers: vi.fn(async () => []), deleteServer: vi.fn(async () => {}), listAuditLogs: vi.fn(async () => []),
});

describe('AdminService', () => {
  it('khóa tài khoản bắt buộc có lý do', async () => {
    const r = repo();
    await expect(new AdminService(r).lockUser('u1', '  ')).rejects.toThrow('lý do');
    expect(r.lockUser).not.toHaveBeenCalled();
    await new AdminService(r).lockUser('u1', ' spam ');
    expect(r.lockUser).toHaveBeenCalledWith('u1', 'spam');
  });
  it('đặt hạn mức chỉ nhận số MB hợp lệ', async () => {
    const r = repo();
    await expect(new AdminService(r).setQuota('u1', 'abc')).rejects.toThrow();
    await new AdminService(r).setQuota('u1', '200');
    expect(r.setQuotaMb).toHaveBeenCalledWith('u1', 200);
  });
  it('nhật ký phân trang theo 50 dòng', async () => {
    const r = repo();
    await new AdminService(r).listAuditLogs(' ServerDeleted ', 2);
    expect(r.listAuditLogs).toHaveBeenCalledWith({ action: 'ServerDeleted', skip: 100, take: 50 });
  });
});
