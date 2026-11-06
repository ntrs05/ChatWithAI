import { BellOff, Bell, BellRing, CheckCheck, LogOut, UserPlus } from 'lucide-react';
import { toast } from '@/shared/event-bus';
import { errorMessage } from '@/shared/http';
import { ContextMenu, type MenuItem } from '@/shared/ui';
import { selectServerUnread, useServerStore } from '../application/serverStore';
import type { NotifyLevel, Server } from '../domain/models';
import { MUTE_OPTIONS, NOTIFY_LEVELS, defaultSettings, describeMute, isMuted, levelLabel } from '../domain/rules';
import { serverService } from '../module';

interface Props {
  server: Server;
  /** Vị trí con trỏ chuột khi bấm chuột phải. */
  x: number;
  y: number;
  onClose: () => void;
  onInvite: () => void;
  onLeave: () => void;
}

/** Chạy một thao tác của service, lỗi thì báo bằng toast (menu đã đóng nên không còn chỗ nào khác để hiện lỗi). */
const safe = (action: () => Promise<void> | void) => () => {
  Promise.resolve()
    .then(action)
    .catch((err) => toast.error(errorMessage(err, 'Không thực hiện được')));
};

/**
 * Menu chuột phải vào một server (giống Discord): Đánh dấu đã đọc · Mời vào máy chủ · Tắt âm máy chủ ·
 * Cài đặt thông báo · Rời khỏi máy chủ.
 */
export function ServerContextMenu({ server, x, y, onClose, onInvite, onLeave }: Props) {
  const unread = useServerStore(selectServerUnread(server.id));
  const settings = useServerStore((s) => s.settings[server.id]) ?? defaultSettings;
  const muted = isMuted(settings);

  const muteItem: MenuItem = muted
    ? {
        key: 'unmute',
        icon: <Bell size={16} />,
        label: 'Bật âm máy chủ',
        hint: `Đang tắt âm ${describeMute(settings)}`,
        onSelect: safe(() => serverService().unmuteServer(server.id)),
      }
    : {
        key: 'mute',
        icon: <BellOff size={16} />,
        label: 'Tắt âm máy chủ',
        children: MUTE_OPTIONS.map((o) => ({
          key: o.id,
          label: o.label,
          onSelect: safe(() => serverService().muteServer(server.id, o.minutes)),
        })),
      };

  const items: MenuItem[] = [
    {
      key: 'read',
      icon: <CheckCheck size={16} />,
      label: 'Đánh dấu đã đọc',
      disabled: unread === 0,
      onSelect: () => serverService().markServerRead(server.id),
    },
    { key: 'invite', icon: <UserPlus size={16} />, label: 'Mời vào máy chủ', separatorBefore: true, onSelect: onInvite },
    muteItem,
    {
      key: 'notify',
      icon: <BellRing size={16} />,
      label: 'Cài đặt thông báo',
      hint: levelLabel(settings.level),
      children: NOTIFY_LEVELS.map((l) => ({
        key: l.id,
        label: l.label,
        checked: settings.level === l.id,
        onSelect: safe(() => serverService().setNotifyLevel(server.id, l.id as NotifyLevel)),
      })),
    },
    { key: 'leave', icon: <LogOut size={16} />, label: 'Rời khỏi máy chủ', danger: true, separatorBefore: true, onSelect: onLeave },
  ];

  return <ContextMenu x={x} y={y} items={items} onClose={onClose} />;
}
