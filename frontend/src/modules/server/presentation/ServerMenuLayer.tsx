import { useState, type ReactNode } from 'react';
import type { Server } from '../domain/models';
import { InviteModal } from './InviteModal';
import { LeaveServerModal } from './LeaveServerModal';
import { ServerContextMenu } from './ServerContextMenu';

interface Props {
  server: Server;
  anchor: { x: number; y: number } | null;
  onCloseMenu: () => void;
  renderInviteExtra?: (server: Server) => ReactNode;
}

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
