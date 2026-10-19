import { http } from '@/shared/http';
import type { AuthRepository } from '../application/ports';
import type { AuthSession, LoginInput, RegisterInput, User } from '../domain/User';

/** Hiện thực AuthRepository bằng REST API của backend thật. */
export class HttpAuthRepository implements AuthRepository {
  login(input: LoginInput): Promise<AuthSession> {
    return http<AuthSession>('/auth/login', { method: 'POST', body: input });
  }

  register(input: Omit<RegisterInput, 'confirmPassword'>): Promise<AuthSession> {
    return http<AuthSession>('/auth/register', { method: 'POST', body: input });
  }

  me(): Promise<User> {
    return http<User>('/auth/me');
  }

  logout(): Promise<void> {
    return http<void>('/auth/logout', { method: 'POST' });
  }
}
