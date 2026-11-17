import type { AuthSession, LoginInput, ProfileInput, RegisterInput, User } from '../domain/User';

export interface AuthRepository {
  login(input: LoginInput): Promise<AuthSession>;
  register(input: Omit<RegisterInput, 'confirmPassword'>): Promise<AuthSession>;
  loginWithGoogle(idToken: string): Promise<AuthSession>;
  me(): Promise<User>;
  logout(): Promise<void>;
  updateProfile(input: ProfileInput): Promise<User>;
  changePassword(input: { currentPassword: string; newPassword: string }): Promise<void>;
  uploadAvatar(file: File): Promise<string>;
}
