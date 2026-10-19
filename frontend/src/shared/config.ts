/**
 * Cấu hình toàn cục — đọc từ biến môi trường của Vite (.env).
 *
 * VITE_API_MODE=mock  → chạy độc lập, "backend giả" nằm trong trình duyệt
 *                       (localStorage + IndexedDB + BroadcastChannel giữa các tab).
 * VITE_API_MODE=http  → gọi REST API + Socket.IO của backend thật.
 */
export type ApiMode = 'mock' | 'http';

export const config = {
  appName: 'Nebula',
  apiMode: (import.meta.env.VITE_API_MODE as ApiMode) || 'mock',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL || '',
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] as RTCIceServer[],
  messagePageSize: 30,
  maxUploadBytes: 8 * 1024 * 1024,
} as const;

/** Tài khoản demo của backend giả lập (mật khẩu chung: 123456). */
export const demoAccounts = [
  { email: 'admin@nebula.vn', password: '123456', label: 'Admin', hint: 'Quản trị viên — được tạo kênh' },
  { email: 'user@nebula.vn', password: '123456', label: 'User', hint: 'Người dùng thường' },
] as const;
