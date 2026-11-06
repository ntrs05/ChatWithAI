import { useMemo, useState, type ReactNode } from 'react';
import { AtSign, Bell, BellOff, Check, CheckCheck, MessageCircle, ShieldCheck, UserPlus, Users, LogOut as LeaveIcon, MailPlus } from 'lucide-react';
import { cn, formatTime } from '@/shared/lib';
import { Avatar, Button, IconButton, Spinner } from '@/shared/ui';
import { useNotificationStore } from '../application/notificationStore';
import type { AppNotification } from '../domain/models';
import { describe, groupByDay } from '../domain/rules';
import { notificationService } from '../module';

/** Biểu tượng theo loại thông báo (dùng khi không có ảnh người gây ra thông báo). */
function TypeIcon({ type }: { type: string }) {
  const map: Record<string, ReactNode> = {
    Mention: <AtSign size={18} />,
    DirectMessage: <MessageCircle size={18} />,
    FriendRequest: <UserPlus size={18} />,
    FriendAccepted: <Users size={18} />,
    JoinRequest: <MailPlus size={18} />,
    AddedToServer: <Users size={18} />,
    RemovedFromServer: <LeaveIcon size={18} />,
    RoleChanged: <ShieldCheck size={18} />,
    ServerOwner: <ShieldCheck size={18} />,
  };
  return <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-600 text-brand-300">{map[type] ?? <Bell size={18} />}</span>;
}

function Item({ n, onOpen }: { n: AppNotification; onOpen: (n: AppNotification) => void }) {
  const { title, body } = describe(n);
  return (
    <li>
      <div
        className={cn(
          'group relative flex items-start gap-3 rounded-xl border px-3 py-3 transition',
          n.isRead ? 'border-transparent hover:bg-ink-750' : 'border-brand-400/20 bg-brand-400/5 hover:bg-brand-400/10',
        )}
      >
        <button
          type="button"
          onClick={() => {
            void notificationService().markRead(n);
            onOpen(n);
          }}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          {n.actor ? <Avatar src={n.actor.avatarUrl} name={n.actor.displayName} size={40} /> : <TypeIcon type={n.type} />}
          <span className="min-w-0 flex-1">
            <span className={cn('block text-[15px]', n.isRead ? 'text-slate-300' : 'font-semibold text-white')}>{title}</span>
            {body && <span className="mt-0.5 line-clamp-2 block break-words text-sm text-muted">{body}</span>}
          </span>
          <time className="shrink-0 pt-0.5 text-xs text-muted" dateTime={n.createdAt}>
            {formatTime(n.createdAt)}
          </time>
        </button>
        {!n.isRead && (
          <>
            <span aria-label="Chưa đọc" className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-nova-500 group-hover:hidden" />
            <span className="hidden group-hover:block">
              <IconButton label="Đánh dấu đã đọc" onClick={() => void notificationService().markRead(n)}>
                <Check size={16} />
              </IconButton>
            </span>
          </>
        )}
      </div>
    </li>
  );
}

/** Trang Thông báo: danh sách (mới → cũ, gom theo ngày), lọc chưa đọc, đánh dấu đã đọc. */
export function NotificationsView({ onOpen }: { onOpen: (n: AppNotification) => void }) {
  const items = useNotificationStore((s) => s.items);
  const unread = useNotificationStore((s) => s.unread);
  const loaded = useNotificationStore((s) => s.loaded);
  const hasMore = useNotificationStore((s) => s.hasMore);
  const loadingMore = useNotificationStore((s) => s.loadingMore);
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  const shown = tab === 'unread' ? items.filter((n) => !n.isRead) : items;
  const groups = useMemo(() => groupByDay(shown), [shown]);

  return (
    <div className="flex h-full w-full flex-col bg-ink-800">
      <header className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 border-b border-black/20 px-4 py-2 pl-14 md:pl-4">
        <span className="flex items-center gap-2 font-display text-[15px] font-bold text-white">
          <Bell size={20} className="text-brand-300" /> Thông báo
        </span>
        <span className="hidden h-5 w-px bg-white/10 sm:block" />
        <nav className="flex items-center gap-1" aria-label="Bộ lọc thông báo">
          {(['all', 'unread'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-current={tab === t ? 'page' : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                tab === t ? 'bg-brand-400/15 text-white' : 'text-muted hover:bg-white/5 hover:text-slate-200',
              )}
            >
              {t === 'all' ? 'Tất cả' : 'Chưa đọc'}
              {t === 'unread' && unread > 0 && <span className="rounded-full bg-nova-500 px-1.5 text-[11px] font-bold leading-[18px] text-white">{unread}</span>}
            </button>
          ))}
        </nav>
        <Button variant="ghost" size="sm" className="ml-auto" disabled={unread === 0} icon={<CheckCheck size={16} />} onClick={() => void notificationService().markAllRead()}>
          Đánh dấu tất cả đã đọc
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-2xl">
          {!loaded ? (
            <div className="flex justify-center py-16">
              <Spinner size={26} className="text-brand-400" />
            </div>
          ) : shown.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center text-muted">
              <span className="mb-3 rounded-2xl bg-ink-750 p-4 text-brand-300">
                <BellOff size={28} />
              </span>
              <p className="font-semibold text-slate-200">{tab === 'unread' ? 'Bạn đã đọc hết thông báo' : 'Chưa có thông báo nào'}</p>
              <p className="mt-1 max-w-xs text-sm">Khi ai đó nhắc đến bạn, nhắn tin riêng, mời kết bạn hoặc mời vào server, bạn sẽ thấy ở đây.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((g) => (
                <section key={g.day}>
                  <h3 className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">{g.day}</h3>
                  <ul className="space-y-1">
                    {g.items.map((n) => (
                      <Item key={n.id} n={n} onOpen={onOpen} />
                    ))}
                  </ul>
                </section>
              ))}
              {hasMore && (
                <div className="flex justify-center">
                  <Button variant="secondary" loading={loadingMore} onClick={() => void notificationService().loadMore()}>
                    Xem thêm
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
