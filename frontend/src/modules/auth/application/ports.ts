import type { AuthSession, LoginInput, ProfileInput, RegisterInput, User } from '../domain/User';

/** Cổng ra (output port) — tầng infrastructure hiện thực bằng Mock hoặc HTTP. */
export interface AuthRepository {
  login(input: LoginInput): Promise<AuthSession>;
  register(input: Omit<RegisterInput, 'confirmPassword'>): Promise<AuthSession>;
  /** Đăng nhập bằng Google: idToken là "credential" do Google Identity Services trả về. Lần đầu sẽ tự tạo tài khoản. */
  loginWithGoogle(idToken: string): Promise<AuthSession>;
  me(): Promise<User>;
  logout(): Promise<void>;
  /** Đổi tên hiển thị, ảnh đại diện, giới thiệu. */
  updateProfile(input: ProfileInput): Promise<User>;
  /** Đổi mật khẩu. Tài khoản đăng nhập Google chưa có mật khẩu thì bỏ trống currentPassword để đặt mật khẩu lần đầu. */
  changePassword(input: { currentPassword: string; newPassword: string }): Promise<void>;
  /** Tải ảnh đại diện lên, trả về URL ảnh để đặt vào hồ sơ. */
  uploadAvatar(file: File): Promise<string>;
}
