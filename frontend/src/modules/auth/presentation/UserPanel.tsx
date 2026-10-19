import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { Avatar, IconButton } from '@/shared/ui';
import { useAuthStore } from '../application/authStore';
import { authService } from '../module';

/** Thẻ người dùng ở góc dưới thanh kênh. `actions` là chỗ module khác (voice) gắn nút vào. */
export function UserPanel({ actions }: { actions?: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return (
    <div className="flex items-center gap-2 border-t border-white/5 bg-ink-900/80 px-2.5 py-2">
      <Avatar src={user.avatarUrl} name={user.displayName} size={34} status="online" />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-sm font-semibold text-white">{user.displayName}</div>
        <div className="truncate text-xs text-muted">@{user.username}</div>
      </div>
      {actions}
      <IconButton label="Đăng xuất" onClick={() => void authService().logout()}>
        <LogOut size={17} />
      </IconButton>
    </div>
  );
}
