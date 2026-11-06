import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Copy, IdCard } from 'lucide-react';
import { toast } from '@/shared/event-bus';
import { copyText } from '@/shared/lib';
import { Avatar, Button } from '@/shared/ui';
import { formatUserCode, type User } from '../domain/User';

/** Chép một giá trị và báo kết quả bằng toast. */
export async function copyWithToast(value: string, label: string) {
  const ok = await copyText(value);
  toast[ok ? 'success' : 'error'](ok ? `Đã sao chép ${label}` : `Không sao chép được ${label}`);
}

/**
 * Để chuột lên một vùng (ảnh đại diện + tên của CHÍNH MÌNH) thì hiện thẻ nhỏ có Tên hiển thị và ID.
 * Bấm vào vùng đó để sao chép ID. Thẻ vẽ qua portal vì thanh bên có overflow.
 */
export function IdentityHover({ user, children }: { user: User; children: ReactNode }) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const show = (el: HTMLElement) => setAnchor(el.getBoundingClientRect());

  return (
    <div
      className="min-w-0 flex-1"
      onMouseEnter={(e) => show(e.currentTarget)}
      onMouseLeave={() => setAnchor(null)}
      onFocus={(e) => show(e.currentTarget)}
      onBlur={() => setAnchor(null)}
    >
      <button
        type="button"
        onClick={() => void copyWithToast(user.userCode, 'ID')}
        aria-label={`Tên ${user.displayName}, ID ${formatUserCode(user.userCode)}. Bấm để sao chép ID`}
        className="flex w-full items-center gap-2 rounded-lg p-0.5 text-left transition hover:bg-white/5"
      >
        {children}
      </button>
      {anchor &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-50 w-64 animate-fade-in rounded-xl border border-white/10 bg-ink-950 p-3 shadow-2xl"
            style={{ left: Math.min(anchor.left, window.innerWidth - 272), bottom: window.innerHeight - anchor.top + 8 }}
          >
            <div className="flex items-center gap-3">
              <Avatar src={user.avatarUrl} name={user.displayName} size={44} />
              <div className="min-w-0">
                <div className="truncate font-display text-[15px] font-bold text-white">{user.displayName}</div>
                <div className="truncate text-xs text-muted">@{user.username}</div>
              </div>
            </div>
            <dl className="mt-3 space-y-1.5 rounded-lg bg-ink-800/80 p-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Tên</dt>
                <dd className="truncate font-semibold text-slate-100">{user.displayName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">ID</dt>
                <dd className="font-mono font-bold tracking-wider text-brand-200">{formatUserCode(user.userCode)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] text-muted">Bạn bè cần biết cả tên và ID này để kết bạn. Bấm để sao chép ID.</p>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Thẻ "Tên và ID của bạn" kèm nút sao chép — dùng trong Cài đặt và trang Thêm bạn. */
export function IdentityBadge({ user, compact }: { user: User; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-brand-400/25 bg-brand-400/5 p-4">
      <div className="flex items-center gap-3">
        <Avatar src={user.avatarUrl} name={user.displayName} size={compact ? 40 : 52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-200">
            <IdCard size={14} /> Tên và ID của bạn
          </div>
          <div className="mt-0.5 truncate font-display text-lg font-bold text-white">{user.displayName}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-ink-950/70 px-3 py-1.5 font-mono text-lg font-bold tracking-[0.25em] text-brand-200">{formatUserCode(user.userCode)}</span>
        <Button size="sm" variant="secondary" icon={<Copy size={15} />} onClick={() => void copyWithToast(user.userCode, 'ID')}>
          Chép ID
        </Button>
        <Button size="sm" variant="ghost" icon={<Copy size={15} />} onClick={() => void copyWithToast(user.displayName, 'tên')}>
          Chép tên
        </Button>
      </div>
      {!compact && <p className="mt-2 text-xs text-muted">Gửi cả <b>tên</b> và <b>ID</b> này cho bạn bè — họ cần biết cả hai mới gửi được lời mời kết bạn.</p>}
    </div>
  );
}
