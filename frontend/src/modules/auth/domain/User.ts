import type { UserProfile } from '@/shared/types';
export interface User extends UserProfile {
  email: string;
  createdAt: string;
  /** ID công khai 4 chữ số "0000"–"9999" (như Discord: Tên#0042). Người khác cần biết cả TÊN lẫn ID này mới kết bạn với bạn được. */
  userCode: string;
  bio: string;
  /** false = tài khoản chỉ đăng nhập bằng Google, chưa đặt mật khẩu. */
  hasPassword: boolean;
  /** Admin hệ thống: thấy trang Quản trị. Quyền thật vẫn do backend kiểm tra ở mỗi API. */
  isAdmin: boolean;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  displayName: string;
  password: string;
  confirmPassword: string;
  avatarUrl: string;
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export interface ProfileInput {
  displayName: string;
  avatarUrl: string;
  bio: string;
}

export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// TODO: validateLogin, validateRegister, hasErrors, formatUserCode, parseUserCode, validateProfile, validatePasswordChange
