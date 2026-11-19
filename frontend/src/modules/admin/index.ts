/**
 * PUBLIC API của module Admin (giao diện quản trị hệ thống — chỉ admin hệ thống dùng).
 * Module khác CHỈ được import từ file này, không import sâu vào bên trong.
 */
export { initAdminModule, adminService } from './module';
export { AdminPage } from './presentation/AdminPage';
