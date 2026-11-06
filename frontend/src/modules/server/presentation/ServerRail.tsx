import { useState, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BellOff, Compass, Plus } from 'lucide-react';
import { cn } from '@/shared/lib';
import { LogoMark } from '@/shared/ui';
import { selectServerUnread, useServerStore } from '../application/serverStore';
import { isMuted } from '../domain/rules';
import type { Server } from '../domain/models';
import { CreateServerModal } from './CreateServerModal';
import { ServerMenuLayer } from './ServerMenuLayer';

/** Tooltip vẽ qua portal (thanh rail có overflow nên không dùng absolute được). */
function RailTooltip({ label, anchor }: { label: string; anchor: DOMRect | null }) {
  if (!anchor) return null;
  return createPortal(
    <span
      className="pointer-events-none fixed z-50 -translate-y-1/2 animate-fade-in whitespace-nowrap rounded-lg border border-white/10 bg-ink-950 px-3 py-1.5 text-sm font-semibold text-white shadow-xl"
      style={{ left: anchor.right + 14, top: anchor.top + anchor.height / 2 }}
    >
      {label}
    </span>,
    document.body,
  );
}

function RailButton({
  label,
  active,
  onClick,
  onContextMenu,
  children,
  badge,
  dimmed,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  onContextMenu?: (e: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  badge?: number;
  /** Server đang tắt âm: làm mờ icon. */
  dimmed?: boolean;
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  return (
    <div
      className="group relative flex justify-center"
      onMouseEnter={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setAnchor(null)}
    >
      <span
        className={cn(
          'absolute -left-3 top-1/2 w-1.5 -translate-y-1/2 rounded-r-full bg-brand-300 transition-all',
          active ? 'h-8' : badge ? 'h-2' : 'h-0 group-hover:h-4',
        )}
      />
      <button
        type="button"
        onClick={() => {
          setAnchor(null);
          onClick();
        }}
        onContextMenu={
          onContextMenu &&
          ((e) => {
            setAnchor(null);
            onContextMenu(e);
          })
        }
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200',
          active ? 'bg-ink-600 ring-2 ring-brand-400/80' : 'bg-ink-750 hover:-translate-y-0.5 hover:bg-ink-600',
          dimmed && 'opacity-60',
        )}
      >
        {children}
        {!!badge && (
          <span className="absolute -bottom-1 -right-1 min-w-[20px] rounded-full border-[3px] border-ink-900 bg-nova-500 px-1 text-center text-[11px] font-bold leading-[14px] text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
      <RailTooltip label={label} anchor={anchor} />
    </div>
  );
}

function ServerButton({ server, active, renderInviteExtra }: { server: Server; active: boolean; renderInviteExtra?: (s: Server) => ReactNode }) {
  const navigate = useNavigate();
  const unread = useServerStore(selectServerUnread(server.id));
  const muted = useServerStore((s) => isMuted(s.settings[server.id]));
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  return (
    <>
      <RailButton
        label={muted ? `${server.name} (đã tắt âm)` : server.name}
        active={active}
        badge={unread}
        dimmed={muted}
        onClick={() => navigate(`/app/${server.id}`)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <img src={server.iconUrl} alt="" className="h-8 w-8 object-contain drop-shadow" draggable={false} />
        {muted && (
          <span className="absolute -right-1 -top-1 rounded-full border-2 border-ink-900 bg-ink-600 p-0.5 text-slate-300">
            <BellOff size={11} />
          </span>
        )}
      </RailButton>
      <ServerMenuLayer server={server} anchor={menu} onCloseMenu={() => setMenu(null)} renderInviteExtra={renderInviteExtra} />
    </>
  );
}

/** Nút phụ ở cuối thanh rail do composition root cấp (VD: Bạn bè) — module Server không biết module khác. */
export interface RailExtra {
  key: string;
  label: string;
  active: boolean;
  badge?: number;
  icon: ReactNode;
  onClick: () => void;
}

/** Thanh server bên trái. */
export function ServerRail({
  view,
  renderInviteExtra,
  extras = [],
}: {
  /** Màn hình đang mở; chỉ 'home' và 'server' làm sáng nút trên rail, các màn khác (bạn bè, cài đặt…) do `extras` / nút riêng xử lý. */
  view: 'home' | 'friends' | 'discover' | 'server' | 'settings' | 'dm' | 'notifications' | 'admin';
  renderInviteExtra?: (server: Server) => ReactNode;
  extras?: RailExtra[];
}) {
  const navigate = useNavigate();
  const servers = useServerStore((s) => s.servers);
  const invitationCount = useServerStore((s) => s.invitations.length);
  const activeServerId = useServerStore((s) => s.activeServerId);
  const [modal, setModal] = useState(false);

  return (
    <nav aria-label="Danh sách server" className="flex w-[76px] shrink-0 flex-col items-center gap-2.5 overflow-y-auto bg-ink-950 py-3 scrollbar-none">
      <RailButton label="Trang chủ" active={view === 'home'} badge={invitationCount} onClick={() => navigate('/app')}>
        <LogoMark size={30} />
      </RailButton>
      {extras.map((x) => (
        <RailButton key={x.key} label={x.label} active={x.active} badge={x.badge} onClick={x.onClick}>
          {x.icon}
        </RailButton>
      ))}
      <div className="my-1 h-px w-8 bg-white/10" />
      {servers.map((s) => (
        <ServerButton key={s.id} server={s} active={view === 'server' && s.id === activeServerId} renderInviteExtra={renderInviteExtra} />
      ))}
      <RailButton label="Tạo hoặc tham gia server" onClick={() => setModal(true)}>
        <Plus size={22} className="text-brand-300" />
      </RailButton>
      <RailButton label="Khám phá server" active={view === 'discover'} onClick={() => navigate('/app/discover')}>
        <Compass size={22} className="text-aurora-300" />
      </RailButton>
      <CreateServerModal open={modal} onClose={() => setModal(false)} />
    </nav>
  );
}
