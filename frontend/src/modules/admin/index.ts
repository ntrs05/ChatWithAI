// Cửa ra của module admin (UC19, UC20, UC21, UC22, TV-Admin phụ trách).
// Module khác chỉ import những gì export ở đây, muốn cho dùng thêm gì thì thêm vào file này.
export { initAdminModule } from './module';
export { AdminPage } from './presentation/AdminPage';
export { AuditTab } from './presentation/AuditTab';
export { ServersTab } from './presentation/ServersTab';
export { UsersTab } from './presentation/UsersTab';
