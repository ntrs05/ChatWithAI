import { config } from '../config';

const KEY = 'nebula.token';

/**
 * Nơi lưu access token.
 *  - mock: sessionStorage → MỖI TAB một phiên, nên có thể mở 2 tab với 2 tài khoản
 *          khác nhau để thử chat/voice realtime (dữ liệu "server" vẫn dùng chung).
 *  - http: localStorage → giữ đăng nhập giữa các tab như ứng dụng thật.
 */
const storage = (): Storage => (config.apiMode === 'mock' ? sessionStorage : localStorage);

export const tokenStore = {
  get(): string | null {
    try {
      return storage().getItem(KEY);
    } catch {
      return null;
    }
  },
  set(token: string | null) {
    try {
      if (token) storage().setItem(KEY, token);
      else storage().removeItem(KEY);
    } catch {
      /* bỏ qua: chế độ riêng tư */
    }
  },
};
