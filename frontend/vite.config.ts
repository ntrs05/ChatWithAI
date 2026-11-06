/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  // Địa chỉ backend Nebula khi chạy `npm run dev`. Đổi bằng VITE_BACKEND_URL trong .env nếu API chạy cổng khác.
  const backend = loadEnv(mode, process.cwd(), '').VITE_BACKEND_URL || 'http://localhost:5000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // Trình duyệt chỉ nói chuyện với :5173; Vite chuyển tiếp REST (/api) và WebSocket SignalR (/hubs) sang backend
      // → cùng origin, không cần cấu hình CORS.
      proxy: {
        '/api': { target: backend, changeOrigin: true },
        '/hubs': { target: backend, changeOrigin: true, ws: true },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
