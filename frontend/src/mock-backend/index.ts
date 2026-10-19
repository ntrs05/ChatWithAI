/**
 * BACKEND GIẢ LẬP (chỉ dùng khi VITE_API_MODE=mock).
 *
 * Đóng vai trò "server" để frontend chạy độc lập khi chưa có backend:
 *   - CSDL     : localStorage
 *   - Lưu file : IndexedDB
 *   - Realtime : BroadcastChannel (Pub-Sub giữa các tab)
 *
 * Chỉ tầng INFRASTRUCTURE của các module được phép import thư mục này.
 */
export * from './db';
export * from './schema';
export { serverBroadcast, MockRealtimeTransport } from './realtime';
export { putBlob, getBlob, clearBlobs } from './blobStore';
export { ensureSeeded } from './seed';
