import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/shared/ui';
import { cn } from '@/shared/lib';
import { useDirectStore } from '../application/directStore';

/** Danh sách chat 1-1 (hiện ở thanh bên của Trang chủ). */
export function DirectList({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const chats = useDirectStore((s) => s.chats);
  const activeId = useDirectStore((s) => s.activeId);

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <h3 className="px-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted">Tin nhắn trực tiếp</h3>
      {chats.length === 0 ? (
        <p className="px-4 py-2 text-xs text-muted">Chưa có cuộc trò chuyện nào. Mở tab Bạn bè và bấm “Nhắn tin”.</p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {chats.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => {
                  navigate(`/app/dm/${c.id}`);
                  onNavigate?.();
                }}
                aria-current={c.id === activeId ? 'page' : undefined}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition',
                  c.id === activeId ? 'bg-brand-400/15 text-white' : c.hasUnread ? 'text-white hover:bg-white/5' : 'text-muted hover:bg-white/5 hover:text-slate-200',
                )}
              >
                <Avatar src={c.user.avatarUrl} name={c.user.displayName} size={32} />
                <span className={cn('min-w-0 flex-1 truncate text-[15px]', c.hasUnread && 'font-semibold')}>{c.user.displayName}</span>
                {c.hasUnread && <span aria-label="Có tin chưa đọc" className="h-2.5 w-2.5 shrink-0 rounded-full bg-nova-500" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
