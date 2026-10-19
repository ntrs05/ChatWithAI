import type { AppEventBus } from '@/shared/event-bus';
import { tokenStore } from '@/shared/http';
import type { AuthSession, LoginInput, RegisterInput } from '../domain/User';
import type { AuthRepository } from './ports';
import { useAuthStore } from './authStore';

/**
 * UC01 — Đăng ký / Đăng nhập (tầng Application).
 * Điều phối: gọi repository → cập nhật store → PUBLISH sự kiện cho các module khác.
 */
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly bus: AppEventBus,
  ) {}

  async restoreSession(): Promise<void> {
    const token = tokenStore.get();
    if (!token) {
      useAuthStore.setState({ status: 'anonymous', user: null, token: null });
      return;
    }
    try {
      const user = await this.repo.me();
      this.applySession({ token, user });
    } catch {
      tokenStore.set(null);
      useAuthStore.setState({ status: 'anonymous', user: null, token: null });
    }
  }

  async login(input: LoginInput): Promise<void> {
    const session = await this.repo.login({ email: input.email.trim().toLowerCase(), password: input.password });
    this.applySession(session);
  }

  async register(input: RegisterInput): Promise<void> {
    const session = await this.repo.register({
      email: input.email.trim().toLowerCase(),
      displayName: input.displayName.trim(),
      password: input.password,
      avatarUrl: input.avatarUrl,
    });
    this.applySession(session);
    this.bus.publish('ui.toast', { kind: 'success', message: `Chào mừng ${session.user.displayName} đến với Nebula!` });
  }

  async logout(): Promise<void> {
    // Thông báo trước để voice/chat dọn dẹp khi token vẫn còn hiệu lực
    this.bus.publish('auth.loggingOut', {});
    try {
      await this.repo.logout();
    } finally {
      tokenStore.set(null);
      useAuthStore.setState({ status: 'anonymous', user: null, token: null });
      this.bus.publish('auth.loggedOut', {});
    }
  }

  private applySession(session: AuthSession) {
    tokenStore.set(session.token);
    useAuthStore.setState({ status: 'authenticated', user: session.user, token: session.token });
    this.bus.publish('auth.loggedIn', { user: session.user, token: session.token });
  }
}
