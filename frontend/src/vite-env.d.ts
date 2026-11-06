/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_HUB_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** Chỉ dùng cho kiểm thử tích hợp (src/integration). */
  readonly VITE_NEBULA_TEST_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
