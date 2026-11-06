import { AdminService } from './application/AdminService';
import { createAdminRepository } from './infrastructure';

let instance: AdminService | null = null;

export function initAdminModule(): AdminService {
  instance = new AdminService(createAdminRepository());
  return instance;
}

export function adminService(): AdminService {
  if (!instance) throw new Error('Module Admin chưa được khởi tạo');
  return instance;
}
