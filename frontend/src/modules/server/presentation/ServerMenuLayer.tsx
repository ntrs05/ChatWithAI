import { useState, type ReactNode } from 'react';
import type { Server } from '../domain/models';
import { InviteModal } from './InviteModal';
import { LeaveServerModal } from './LeaveServerModal';
import { ServerContextMenu } from './ServerContextMenu';

interface Props {
  server: Server;
  /** Vị trí mở menu chuột phải; null = đang đóng. Chủ sở hữu (rail / sidebar) giữ state này. */
  anchor: { x: number; y: number } | null;
  onCloseMenu: () => void;
  /** Slot: danh sách bạn bè để mời, do composition root cấp (module Friends). */
  renderInviteExtra?: (server: Server) => ReactNode;
}

/**
 * Menu chuột phải của một server + hai hộp thoại mà nó mở (Mời vào máy chủ, Rời khỏi máy chủ).
 * Hộp thoại giữ state riêng nên vẫn mở khi menu đã đóng sau khi chọn mục.
 */
export function ServerMenuLayer({ server, anchor, onCloseMenu, renderInviteExtra }: Props) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  return (
    <>
      {anchor && (
        <ServerContextMenu
          server={server}
          x={anchor.x}
          y={anchor.y}
          onClose={onCloseMenu}
          onInvite={() => setInviteOpen(true)}
          onLeave={() => setLeaveOpen(true)}
        />
      )}
      <InviteModal server={server} open={inviteOpen} onClose={() => setInviteOpen(false)} extra={renderInviteExtra?.(server)} />
      <LeaveServerModal server={server} open={leaveOpen} onClose={() => setLeaveOpen(false)} />
    </>
  );
}
