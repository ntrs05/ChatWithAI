import { config } from '../config';
import { ApiError } from './ApiError';
import { tokenStore } from './tokenStore';

type Query = Record<string, string | number | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
  keepalive?: boolean;
}

function buildUrl(path: string, query?: Query): string {
  const url = `${config.apiBaseUrl}${path}`;
  if (!query) return url;
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${url}?${qs}` : url;
}

async function parseError(res: Response): Promise<ApiError> {
  let message = res.statusText || 'Yêu cầu thất bại';
  let code: string | undefined;
  try {
    // Backend Nebula trả ProblemDetails: title = mã lỗi (vd "Server.InvalidCode"), detail = thông báo cho người dùng.
    const data = await res.json();
    message = data.detail ?? data.message ?? message;
    code = data.title ?? data.code;
  } catch {
    /* body không phải JSON */
  }
  return new ApiError(message, res.status, code);
}

export async function http<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    signal: opts.signal,
    keepalive: opts.keepalive,
    headers: {
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    // Token hết hạn / tài khoản bị khóa: báo để ứng dụng đưa người dùng về trang đăng nhập.
    if (res.status === 401 && token) unauthorizedHandler?.();
    throw await parseError(res);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();   // một số API trả 200 không có body
  return (text ? JSON.parse(text) : undefined) as T;
}

let unauthorizedHandler: (() => void) | null = null;
export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler;
}

export function uploadWithProgress<T>(
  path: string,
  form: FormData,
  onProgress?: (ratio: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', buildUrl(path));
    const token = tokenStore.get();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as T);
      } else {
        let message = 'Tải lên thất bại';
        try {
          const data = JSON.parse(xhr.responseText);
          message = data.detail ?? data.message ?? message;
        } catch {
          /* ignore */
        }
        reject(new ApiError(message, xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError('Mất kết nối khi tải lên', 0));
    xhr.send(form);
  });
}
