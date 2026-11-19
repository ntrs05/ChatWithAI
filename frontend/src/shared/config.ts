/**
 * Cấu hình toàn cục — đọc từ biến môi trường của Vite (.env).
 * Frontend luôn gọi REST API + SignalR của backend Nebula (ASP.NET Core).
 */
export const config = {
  appName: 'Nebula',
  /** REST API. Mặc định đi qua proxy của Vite (/api → backend) nên không bị chặn CORS. */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  /** SignalR hub realtime của backend (cùng proxy). */
  hubUrl: import.meta.env.VITE_HUB_URL || '/hubs/chat',
  /** OAuth Client ID (loại Web application) của Google Cloud. Trống thì ẩn nút "Tiếp tục với Google". */
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] as RTCIceServer[],
  messagePageSize: 30,
  /** Backend cho phép tối đa 25 MB mỗi file (Storage:MaxFileMb). */
  maxUploadBytes: 25 * 1024 * 1024,
} as const;
