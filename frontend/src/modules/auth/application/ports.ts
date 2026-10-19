import type { AuthSession, LoginInput, RegisterInput, User } from '../domain/User';

/** Cổng ra (output port) — tầng infrastructure hiện thực bằng Mock hoặc HTTP. */
export interface AuthRepository {
  login(input: LoginInput): Promise<AuthSession>;
  register(input: Omit<RegisterInput, 'confirmPassword'>): Promise<AuthSession>;
  me(): Promise<User>;
  logout(): Promise<void>;
}
