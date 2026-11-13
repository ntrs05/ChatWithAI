import type { UserProfile } from '@/shared/types';
export interface User extends UserProfile {
  email: string;
  createdAt: string;
  userCode: string;
  bio: string;
  hasPassword: boolean;
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
