import type { ReactNode } from 'react';
import { LogOut, Settings } from 'lucide-react';
import { Avatar, IconButton, useSettingsModal } from '@/shared/ui';
import { useAuthStore } from '../application/authStore';
import { authService } from '../module';
import { IdentityHover } from './IdentityCard';

/**
 * Thẻ người dùng ở góc dưới thanh kênh. `actions` là chỗ module khác (voice) gắn nút vào.
 * Để chuột lên ảnh đại diện / tên của mình → hiện Tên và ID (bấm để chép ID).
 */
export function UserPanel({ actions }: { actions?: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return (
    <div className="flex items-center gap-1.5 border-t border-white/5 bg-ink-900/80 px-2 py-2">
      <IdentityHover user={user}>
        <Avatar src={user.avatarUrl} name={user.displayName} size={34} status="online" />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-semibold text-white">{user.displayName}</span>
          <span className="block truncate text-xs text-muted">@{user.username}</span>
        </span>
      </IdentityHover>
      {actions}
      <IconButton label="Cài đặt người dùng" onClick={() => useSettingsModal.getState().show()}>
        <Settings size={17} />
      </IconButton>
      <IconButton label="Đăng xuất" onClick={() => void authService().logout()}>
        <LogOut size={17} />
      </IconButton>
    </div>
  );
}
