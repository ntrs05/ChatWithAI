import type { AppEventBus } from '@/shared/event-bus';
import { tokenStore } from '@/shared/http';
import type { AuthSession, LoginInput, ProfileInput, RegisterInput } from '../domain/User';
import type { AuthRepository } from './ports';
import { useAuthStore } from './authStore';


// UC01 — Đăng ký / Đăng nhập.

export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly bus: AppEventBus,
  ) {}

  listenProfileChanges(): void {
    this.bus.subscribe('user.profileChanged', ({ user: changed }) => {
      const me = useAuthStore.getState().user;
      if (!me || me.id !== changed.id) return;
      if (me.displayName === changed.displayName && me.avatarUrl === changed.avatarUrl) return; // chính tab này vừa lưu
      const user = { ...me, displayName: changed.displayName, username: changed.username || me.username, avatarUrl: changed.avatarUrl };
      useAuthStore.setState({ user });
      this.bus.publish('auth.profileUpdated', { user });
    });
  }

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

  /** Đăng nhập / đăng ký bằng Google. */
  async loginWithGoogle(idToken: string): Promise<void> {
    this.applySession(await this.repo.loginWithGoogle(idToken));
  }

  /** Trang Cài đặt -> Hồ sơ. Cập nhật store ngay và báo các module khác. */
  async updateProfile(input: ProfileInput): Promise<void> {
    const user = await this.repo.updateProfile({
      displayName: input.displayName.trim(),
      avatarUrl: input.avatarUrl,
      bio: input.bio.trim(),
    });
    useAuthStore.setState({ user });
    this.bus.publish('auth.profileUpdated', { user });
  }

  async changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
    await this.repo.changePassword(input);
    // Tài khoản Google vừa đặt mật khẩu lần đầu -> từ giờ phải nhập mật khẩu hiện tại khi đổi.
    const user = useAuthStore.getState().user;
    if (user && !user.hasPassword) useAuthStore.setState({ user: { ...user, hasPassword: true } });
  }

  uploadAvatar(file: File): Promise<string> {
    return this.repo.uploadAvatar(file);
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
