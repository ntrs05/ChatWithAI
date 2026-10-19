import { ApiError, tokenStore } from '@/shared/http';
import { uid } from '@/shared/lib';
import { mutate, readTable, requireUser, respond, sha256, type UserRow } from '@/mock-backend';
import type { AuthRepository } from '../application/ports';
import type { AuthSession, LoginInput, RegisterInput, User } from '../domain/User';

const toUser = (u: UserRow): User => ({
  id: u.id,
  email: u.email,
  username: u.username,
  displayName: u.displayName,
  avatarUrl: u.avatarUrl,
  createdAt: u.createdAt,
});

function createSession(userId: string): string {
  const token = uid('tok') + uid();
  mutate('sessions', (rows) => [...rows, { token, userId, createdAt: new Date().toISOString() }]);
  return token;
}

/** Hiện thực AuthRepository trên backend giả lập. */
export class MockAuthRepository implements AuthRepository {
  async login(input: LoginInput): Promise<AuthSession> {
    const hash = await sha256(`${input.email}:${input.password}`);
    return respond(() => {
      const user = readTable('users').find((u) => u.email === input.email);
      if (!user || user.passwordHash !== hash) throw new ApiError('Email hoặc mật khẩu không đúng', 401);
      return { token: createSession(user.id), user: toUser(user) };
    }, [250, 450]);
  }

  async register(input: Omit<RegisterInput, 'confirmPassword'>): Promise<AuthSession> {
    const hash = await sha256(`${input.email}:${input.password}`);
    return respond(() => {
      const users = readTable('users');
      if (users.some((u) => u.email === input.email)) throw new ApiError('Email này đã được đăng ký', 409);
      let username = input.email.split('@')[0].replace(/[^a-z0-9_.]/gi, '').toLowerCase() || 'user';
      if (users.some((u) => u.username === username)) username += Math.floor(Math.random() * 1000);
      const row: UserRow = {
        id: uid('u'),
        email: input.email,
        username,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        passwordHash: hash,
        createdAt: new Date().toISOString(),
      };
      mutate('users', (rows) => [...rows, row]);
      return { token: createSession(row.id), user: toUser(row) };
    }, [300, 500]);
  }

  me(): Promise<User> {
    return respond(() => toUser(requireUser(tokenStore.get())));
  }

  logout(): Promise<void> {
    const token = tokenStore.get();
    return respond(() => {
      mutate('sessions', (rows) => rows.filter((s) => s.token !== token));
    });
  }
}
