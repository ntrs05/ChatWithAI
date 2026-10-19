import type { UserProfile } from '@/shared/types';

export interface User extends UserProfile {
  email: string;
  createdAt: string;
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
