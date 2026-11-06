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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Quy tắc nghiệp vụ (domain) — không phụ thuộc React hay API. */
export function validateLogin(input: LoginInput): FieldErrors<LoginInput> {
  const errors: FieldErrors<LoginInput> = {};
  if (!EMAIL_RE.test(input.email.trim())) errors.email = 'Email không hợp lệ';
  if (!input.password) errors.password = 'Vui lòng nhập mật khẩu';
  return errors;
}

export function validateRegister(input: RegisterInput): FieldErrors<RegisterInput> {
  const errors: FieldErrors<RegisterInput> = {};
  if (!EMAIL_RE.test(input.email.trim())) errors.email = 'Email không hợp lệ';
  const name = input.displayName.trim();
  if (name.length < 2 || name.length > 32) errors.displayName = 'Tên hiển thị dài 2–32 ký tự';
  if (input.password.length < 6) errors.password = 'Mật khẩu tối thiểu 6 ký tự';
  if (input.confirmPassword !== input.password) errors.confirmPassword = 'Mật khẩu nhập lại không khớp';
  return errors;
}

export const hasErrors = (e: object) => Object.keys(e).length > 0;

/* ---------- ID công khai ---------- */

/** "0042" → "#0042" cho dễ nhận ra là ID. */
export const formatUserCode = (code: string) => (code ? `#${code}` : '');

/** Lấy ID từ chuỗi người dùng gõ ("0042", "#0042", "42", "# 42"): 1–4 chữ số (0–9999), tự đệm số 0 cho đủ 4. Ngoài ra → null. */
export function parseUserCode(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  return digits.length >= 1 && digits.length <= 4 ? digits.padStart(4, '0') : null;
}

/* ---------- Hồ sơ & mật khẩu (trang Cài đặt) ---------- */

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

export function validateProfile(input: ProfileInput): FieldErrors<ProfileInput> {
  const errors: FieldErrors<ProfileInput> = {};
  const name = input.displayName.trim();
  if (name.length < 2 || name.length > 32) errors.displayName = 'Tên hiển thị dài 2–32 ký tự';
  if (input.bio.length > 300) errors.bio = 'Giới thiệu tối đa 300 ký tự';
  return errors;
}

/** `hasPassword` = false: tài khoản Google chưa có mật khẩu → không cần nhập mật khẩu hiện tại. */
export function validatePasswordChange(input: PasswordChangeInput, hasPassword: boolean): FieldErrors<PasswordChangeInput> {
  const errors: FieldErrors<PasswordChangeInput> = {};
  if (hasPassword && !input.currentPassword) errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
  if (input.newPassword.length < 6) errors.newPassword = 'Mật khẩu mới tối thiểu 6 ký tự';
  else if (hasPassword && input.newPassword === input.currentPassword) errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
  if (input.confirmPassword !== input.newPassword) errors.confirmPassword = 'Mật khẩu nhập lại không khớp';
  return errors;
}
