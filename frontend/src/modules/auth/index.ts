// Cửa ra của module auth (UC01, UC02, UC03, TV-Auth phụ trách).
// Module khác chỉ import những gì export ở đây, muốn cho dùng thêm gì thì thêm vào file này.
export { initAuthModule } from './module';
export { AuthLayout } from './presentation/AuthLayout';
export { GoogleSignIn } from './presentation/GoogleSignIn';
export { IdentityHover } from './presentation/IdentityCard';
export { IdentityBadge } from './presentation/IdentityCard';
export { LoginPage } from './presentation/LoginPage';
export { PasswordInput } from './presentation/PasswordInput';
export { RegisterPage } from './presentation/RegisterPage';
export { SettingsPage } from './presentation/SettingsPage';
export { UserPanel } from './presentation/UserPanel';
