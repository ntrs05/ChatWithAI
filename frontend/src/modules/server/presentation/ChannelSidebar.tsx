import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Hash, Plus, ShieldCheck, UserPlus, Volume2 } from 'lucide-react';
import { cn } from '@/shared/lib';
import { selectMyRole, useServerStore } from '../application/serverStore';
import type { Channel, ChannelType } from '../domain/models';
import { permissions } from '../domain/rules';
import { CreateChannelModal } from './CreateChannelModal';
import { InviteModal } from './InviteModal';

interface Props {
  serverId: string;
  /** Slot: module Voice vẽ danh sách người trong kênh thoại */
  renderVoiceExtra?: (channel: Channel) => ReactNode;
  footer?: ReactNode;
  onNavigate?: () => void;
}

export function ChannelSidebar({ serverId, renderVoiceExtra, footer, onNavigate }: Props) {
  const navigate = useNavigate();
  const server = useServerStore((s) => s.servers.find((x) => x.id === serverId));
  const channels = useServerStore((s) => s.channels[serverId]);
  const activeChannelId = useServerStore((s) => s.activeChannelId);
  const unread = useServerStore((s) => s.unread);
  const role = useServerStore(selectMyRole(serverId));
  const isAdmin = permissions.canCreateChannel(role);

  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createType, setCreateType] = useState<ChannelType | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  if (!server) return <aside className="w-64 shrink-0 bg-ink-850" />;

  const open = (c: Channel) => {
    navigate(`/app/${serverId}/${c.id}`);
    onNavigate?.();
  };

  const section = (type: ChannelType, title: string) => {
    const list = (channels ?? []).filter((c) => c.type === type);
    return (
      <div className="mt-4">
        <div className="group flex items-center px-2 pb-1">
          <span className="flex-1 text-[11px] font-bold uppercase tracking-wider text-muted">{title}</span>
          {isAdmin && (
            <button
              onClick={() => setCreateType(type)}
              aria-label={`Tạo kênh ${type === 'text' ? 'văn bản' : 'thoại'}`}
              title="Tạo kênh"
              className="rounded p-0.5 text-muted hover:text-white"
            >
              <Plus size={15} />
            </button>
          )}
        </div>
        <ul className="space-y-0.5">
          {list.map((c) => {
            const active = c.id === activeChannelId;
            const count = unread[c.id]?.count ?? 0;
            return (
              <li key={c.id}>
                <button
                  onClick={() => open(c)}
                  className={cn(
                    'group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[15px] transition',
                    active ? 'bg-brand-400/15 text-white' : count ? 'text-white hover:bg-white/5' : 'text-muted hover:bg-white/5 hover:text-slate-200',
                  )}
                >
                  {c.type === 'text' ? (
                    <Hash size={17} className={active ? 'text-brand-300' : 'opacity-70'} />
                  ) : (
                    <Volume2 size={17} className={active ? 'text-brand-300' : 'opacity-70'} />
                  )}
                  <span className={cn('flex-1 truncate', count > 0 && 'font-semibold')}>{c.name}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-nova-500 px-1.5 text-[11px] font-bold leading-[18px] text-white">{count}</span>
                  )}
                </button>
                {c.type === 'voice' && renderVoiceExtra?.(c)}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-ink-850">
      {/* Banner + menu server */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="relative flex h-[88px] w-full items-end overflow-hidden bg-gradient-to-br from-brand-600/50 via-ink-700 to-aurora-500/40 px-4 pb-3 text-left"
        >
          <img src={server.iconUrl} alt="" className="absolute -right-3 -top-2 h-24 w-24 opacity-90 drop-shadow-xl" />
          <span className="relative min-w-0 flex-1">
            <span className="block truncate font-display text-[15px] font-bold text-white drop-shadow">{server.name}</span>
            {isAdmin && (
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-nova-500/25 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-nova-300">
                <ShieldCheck size={11} /> Quản trị viên
              </span>
            )}
          </span>
          <ChevronDown size={18} className={cn('relative text-white transition', menuOpen && 'rotate-180')} />
        </button>
        {menuOpen && (
          <div className="absolute left-2 right-2 top-[92px] z-30 animate-fade-in rounded-xl border border-white/10 bg-ink-950 p-1.5 shadow-2xl">
            <MenuItem icon={<UserPlus size={16} />} label="Mời bạn bè" onClick={() => { setMenuOpen(false); setInviteOpen(true); }} />
            {isAdmin && (
              <>
                <MenuItem icon={<Hash size={16} />} label="Tạo kênh văn bản" onClick={() => { setMenuOpen(false); setCreateType('text'); }} />
                <MenuItem icon={<Volume2 size={16} />} label="Tạo kênh thoại" onClick={() => { setMenuOpen(false); setCreateType('voice'); }} />
              </>
            )}
            <div className="mt-1 border-t border-white/5 px-2.5 pb-1 pt-2 text-xs text-muted">
              Mã mời: <span className="font-mono font-bold text-brand-200">{server.inviteCode}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {!channels ? (
          <div className="mt-6 space-y-2 px-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-white/5" />
            ))}
          </div>
        ) : (
          <>
            {section('text', 'Kênh văn bản')}
            {section('voice', 'Kênh thoại')}
          </>
        )}
      </div>

      {footer}

      <InviteModal server={server} open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <CreateChannelModal
        serverId={serverId}
        open={createType !== null}
        defaultType={createType ?? 'text'}
        onClose={() => setCreateType(null)}
      />
    </aside>
  );
}

function MenuItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-200 hover:bg-brand-400/15 hover:text-white"
    >
      <span className="text-brand-300">{icon}</span>
      {label}
    </button>
  );
}
