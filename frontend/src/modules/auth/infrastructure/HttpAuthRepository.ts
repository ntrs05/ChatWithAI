import { http, uploadWithProgress } from '@/shared/http';
import { wire } from '@/shared/realtime';
import { fallbackAvatar } from '@/shared/assets';
import type { AuthRepository } from '../application/ports';
import type { AuthSession, LoginInput, ProfileInput, RegisterInput, User } from '../domain/User';

/** Dạng JSON backend Nebula trả về (check LoginResponse / UserDto). */
interface UserDto {
  id: string;
  email: string;
  displayName: string;
  username?: string;
  avatarUrl: string | null;
  createdAt: string;
  userCode?: string;
  bio?: string | null;
  coverUrl?: string | null;
  phone?: string | null;
  hasPassword?: boolean;
  systemRole?: string;
}
interface LoginResponse {
  accessToken: string;
  user: UserDto;
}

export function toUser(dto: UserDto): User {
  return {
    id: dto.id,
    email: dto.email,
    displayName: dto.displayName,
    username: dto.username || dto.email.split('@')[0],
    avatarUrl: dto.avatarUrl || fallbackAvatar(dto.id),
    createdAt: dto.createdAt,
    userCode: dto.userCode ?? '',
    bio: dto.bio ?? '',
    hasPassword: dto.hasPassword ?? true,
    isAdmin: dto.systemRole === 'Admin',
  };
}

const toSession = (r: LoginResponse): AuthSession => ({ token: r.accessToken, user: toUser(r.user) });

/** Hiện thực AuthRepository bằng REST API của backend. */
export class HttpAuthRepository implements AuthRepository {
  async login(input: LoginInput): Promise<AuthSession> {
    return toSession(await http<LoginResponse>('/auth/login', { method: 'POST', body: input }));
  }

  async register(input: Omit<RegisterInput, 'confirmPassword'>): Promise<AuthSession> {
    return toSession(
      await http<LoginResponse>('/auth/register', {
        method: 'POST',
        body: { email: input.email, displayName: input.displayName, password: input.password, avatarUrl: input.avatarUrl },
      }),
    );
  }

  async loginWithGoogle(idToken: string): Promise<AuthSession> {
    return toSession(await http<LoginResponse>('/auth/google', { method: 'POST', body: { idToken } }));
  }

  async me(): Promise<User> {
    return toUser(await http<UserDto>('/users/me'));
  }

  async updateProfile(input: ProfileInput): Promise<User> {
    const current = await http<UserDto>('/users/me');
    const updated = await http<UserDto>('/users/me', {
      method: 'PUT',
      body: {
        displayName: input.displayName,
        avatarUrl: input.avatarUrl || null,
        coverUrl: current.coverUrl ?? null,
        bio: input.bio || null,
        phone: current.phone ?? null,
      },
    });
    return toUser(updated);
  }

  async changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
    await http('/users/me/password', {
      method: 'PUT',
      body: { currentPassword: input.currentPassword || null, newPassword: input.newPassword },
    });
  }

  async uploadAvatar(file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    return (await uploadWithProgress<{ url: string }>('/avatars', form)).url;
  }

  /** JWT không có trạng thái phía server: đăng xuất chỉ cần xoá token ở client. */
  async logout(): Promise<void> {}
}

export function registerAuthWire(): void {
  wire.onServerEvent<{ userId: string; displayName: string; username: string; avatarUrl: string | null }>(
    'ProfileChanged',
    'user.profileChanged',
    (p) => ({ user: { id: p.userId, displayName: p.displayName, username: p.username, avatarUrl: p.avatarUrl || fallbackAvatar(p.userId) } }),
  );
  wire.onServerEvent<{ userId: string; status: string }>('StatusChanged', 'user.statusChanged', (s) => ({ userId: s.userId, status: s.status }));
}
