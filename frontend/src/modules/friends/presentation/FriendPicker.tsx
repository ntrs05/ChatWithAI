import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { toast } from '@/shared/event-bus';
import { errorMessage } from '@/shared/http';
import { Avatar, Button, Spinner } from '@/shared/ui';
import { useFriendStore } from '../application/friendStore';
import type { Friend } from '../domain/models';
import { isOnline, sortFriends } from '../domain/rules';

interface Props {
  /** Nhãn nút hành động (vd: "Mời"). */
  actionLabel: string;
  /** Nhãn sau khi đã thực hiện (vd: "Đã mời"). */
  doneLabel: string;
  /** Thực hiện hành động cho một người bạn; ném lỗi nếu thất bại (sẽ hiện toast). */
  onAction: (friend: Friend) => Promise<void>;
  /** Bạn đã được xử lý từ trước (vd: đã ở trong server) — hiện nhãn thay cho nút. */
  isDone?: (friend: Friend) => string | null;
}

/**
 * Danh sách bạn bè có nút hành động cạnh mỗi người — dùng làm "Mời bạn bè vào server".
 * Module khác ghép vào qua slot, nên module Friends không biết hành động cụ thể là gì.
 */
export function FriendPicker({ actionLabel, doneLabel, onAction, isDone }: Props) {
  const friends = useFriendStore((s) => s.friends);
  const loaded = useFriendStore((s) => s.loaded);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  if (!loaded) {
    return (
      <div className="flex justify-center py-6">
        <Spinner className="text-brand-300" />
      </div>
    );
  }
  if (friends.length === 0) {
    return <p className="rounded-xl bg-ink-950/50 px-4 py-5 text-center text-sm text-muted">Bạn chưa có bạn bè nào. Hãy kết bạn ở mục <b>Bạn bè</b> trước.</p>;
  }

  const q = filter.trim().toLowerCase();
  const list = sortFriends(friends).filter((f) => !q || f.user.displayName.toLowerCase().includes(q) || f.user.username.toLowerCase().includes(q));

  const act = async (f: Friend) => {
    setBusy(f.id);
    try {
      await onAction(f);
      setDone((s) => new Set(s).add(f.id));
    } catch (err) {
      toast.error(errorMessage(err, 'Không thực hiện được'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {friends.length > 5 && (
        <div className="relative mb-2">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Tìm bạn bè…"
            className="h-9 w-full rounded-lg border border-ink-600 bg-ink-950/60 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
          />
        </div>
      )}
      <ul className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
        {list.map((f) => {
          const note = isDone?.(f) ?? null;
          const finished = done.has(f.id);
          return (
            <li key={f.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5">
              <Avatar src={f.user.avatarUrl} name={f.user.displayName} size={34} status={isOnline(f.user) ? 'online' : 'offline'} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{f.user.displayName}</span>
              {note ? (
                <span className="px-2 text-xs text-muted">{note}</span>
              ) : finished ? (
                <span className="flex items-center gap-1 px-2 text-sm font-medium text-emerald-300">
                  <Check size={15} /> {doneLabel}
                </span>
              ) : (
                <Button variant="secondary" size="sm" loading={busy === f.id} onClick={() => void act(f)}>
                  {actionLabel}
                </Button>
              )}
            </li>
          );
        })}
        {list.length === 0 && <li className="px-2 py-3 text-center text-sm text-muted">Không có ai khớp “{filter}”</li>}
      </ul>
    </div>
  );
}
