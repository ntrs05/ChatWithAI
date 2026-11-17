import { useEffect, useRef, useState } from 'react';
import { config } from '@/shared/config';
import { errorMessage } from '@/shared/http';
import { authService } from '../module';

/** Phần nhỏ của Google Identity Services (GSI) mà ta dùng. https://developers.google.com/identity/gsi/web */
interface GoogleId {
  initialize(cfg: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: 'popup' }): void;
  renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
let gsiLoading: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  gsiLoading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiLoading = null;
      reject(new Error('Không tải được Google Sign-In (kiểm tra kết nối mạng)'));
    };
    document.head.appendChild(script);
  });
  return gsiLoading;
}

interface Props {
  onSuccess: () => void;
  onError: (message: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

/**
 * Nút "Tiếp tục với Google". Google trả về một ID token (JWT); ta gửi nó cho backend, backend tự xác minh
 * chữ ký với Google rồi cấp JWT của hệ thống — client không bao giờ tự quyết định "người này là ai".
 * Chỉ hiện khi chạy với backend thật và đã cấu hình VITE_GOOGLE_CLIENT_ID.
 */
export function GoogleSignIn({ onSuccess, onError, text = 'continue_with' }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const enabled = !!config.googleClientId;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !holder.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          ux_mode: 'popup',
          callback: ({ credential }) => {
            setBusy(true);
            authService()
              .loginWithGoogle(credential)
              .then(onSuccess)
              .catch((err) => onError(errorMessage(err, 'Đăng nhập Google thất bại')))
              .finally(() => setBusy(false));
          },
        });
        window.google.accounts.id.renderButton(holder.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text,
          locale: 'vi',
          width: holder.current.clientWidth || 360,
        });
      })
      .catch((err: Error) => onError(err.message));
    return () => {
      cancelled = true;
    };
    // onSuccess/onError là closure mới mỗi lần render; chỉ cần khởi tạo một lần.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, text]);

  if (!enabled) return null;
  return (
    <div className="mt-5">
      <div className="relative my-4 flex items-center">
        <span className="h-px flex-1 bg-white/10" />
        <span className="mx-3 text-xs uppercase tracking-wider text-muted">hoặc</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className={busy ? 'pointer-events-none opacity-60' : ''}>
        <div ref={holder} className="flex min-h-[44px] w-full justify-center" />
      </div>
    </div>
  );
}
