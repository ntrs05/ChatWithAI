/**
 * PUBLIC API của module Auth (UC01 — Đăng ký / Đăng nhập).
 * Module khác CHỈ được import từ file này, không import sâu vào bên trong.
 */
import './events';

export { initAuthModule, authService } from './module';
export { useAuthStore } from './application/authStore';
export type { AuthStatus } from './application/authStore';
export type { User } from './domain/User';
export { LoginPage } from './presentation/LoginPage';
export { RegisterPage } from './presentation/RegisterPage';
export { UserPanel } from './presentation/UserPanel';
