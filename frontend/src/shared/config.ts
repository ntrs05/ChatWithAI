export const config = {
  appName: 'Nebula',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  hubUrl: import.meta.env.VITE_HUB_URL || '/hubs/chat',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] as RTCIceServer[],
  messagePageSize: 30,
  maxUploadBytes: 25 * 1024 * 1024,
} as const;
