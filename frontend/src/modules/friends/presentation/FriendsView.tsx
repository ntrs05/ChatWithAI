import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Check, Clock, IdCard, Send, UserMinus, Users, X } from 'lucide-react';
import { toast } from '@/shared/event-bus';
import { errorMessage } from '@/shared/http';
import { cn } from '@/shared/lib';
import { Avatar, Button, IconButton, Input, Modal, Spinner } from '@/shared/ui';
import { useFriendStore } from '../application/friendStore';
import { friendService } from '../module';
import type { Friend, FriendRequest, FriendUser } from '../domain/models';
import { isOnline, sortFriends, validateAddFriend, type AddFriendInput } from '../domain/rules';

type Tab = 'all' | 'pending' | 'add';

function Row({ user, sub, children }: { user: FriendUser; sub?: ReactNode; children?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 hover:border-white/5 hover:bg-ink-750">
      <Avatar src={user.avatarUrl} name={user.displayName} size={40} status={isOnline(user) ? 'online' : 'offline'} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-white">{user.displayName}</span>
        <span className="block truncate text-xs text-muted">{sub ?? (user.username ? `@${user.username}` : '')}</span>
      </span>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </li>
  );
}

function Empty({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center text-muted">
      <span className="mb-3 rounded-2xl bg-ink-750 p-4 text-brand-300">{icon}</span>
      <p className="font-semibold text-slate-200">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm">{hint}</p>}
    </div>
  );
}

/** Bắt lỗi của một thao tác bất đồng bộ và báo bằng toast. */
async function run(action: () => Promise<void>, fallback: string) {
  try {
    await action();
  } catch (err) {
    toast.error(errorMessage(err, fallback));
  }
}

function AllFriends({ friends, renderActions }: { friends: Friend[]; renderActions?: (friend: Friend) => ReactNode }) {
  const [confirm, setConfirm] = useState<Friend | null>(null);
  const [busy, setBusy] = useState(false);
  const sorted = useMemo(() => sortFriends(friends), [friends]);
  const online = sorted.filter((f) => isOnline(f.user)).length;

  if (friends.length === 0) {
    return <Empty icon={<Users size={28} />} title="Chưa có bạn bè nào" hint="Chuyển sang tab “Thêm bạn”, nhập tên và ID của người bạn biết để gửi lời mời." />;
  }
  return (
    <>
      <h3 className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">
        Bạn bè — {friends.length} · Trực tuyến {online}
      </h3>
      <ul className="space-y-0.5">
        {sorted.map((f) => (
          <Row key={f.id} user={f.user} sub={isOnline(f.user) ? 'Trực tuyến' : 'Ngoại tuyến'}>
            {renderActions?.(f)}
            <IconButton label="Hủy kết bạn" danger onClick={() => setConfirm(f)}>
              <UserMinus size={17} />
            </IconButton>
          </Row>
        ))}
      </ul>
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Hủy kết bạn?"
        description={confirm && `Bạn và ${confirm.user.displayName} sẽ không còn là bạn bè. Bạn có thể gửi lời mời lại sau.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Giữ lại
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                if (!confirm) return;
                setBusy(true);
                await run(() => friendService().remove(confirm), 'Không hủy được kết bạn');
                setBusy(false);
                setConfirm(null);
              }}
            >
              Hủy kết bạn
            </Button>
          </>
        }
      >
        <span />
      </Modal>
    </>
  );
}

function Pending({ incoming, outgoing }: { incoming: FriendRequest[]; outgoing: FriendRequest[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const act = async (id: string, fn: () => Promise<void>, fallback: string) => {
    setBusyId(id);
    await run(fn, fallback);
    setBusyId(null);
  };

  if (incoming.length === 0 && outgoing.length === 0) {
    return <Empty icon={<Clock size={28} />} title="Không có lời mời nào đang chờ" hint="Lời mời kết bạn bạn nhận và gửi đi sẽ hiện ở đây." />;
  }
  return (
    <div className="space-y-6">
      {incoming.length > 0 && (
        <section>
          <h3 className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">Lời mời đến — {incoming.length}</h3>
          <ul className="space-y-0.5">
            {incoming.map((r) => (
              <Row key={r.id} user={r.user} sub="Muốn kết bạn với bạn">
                <Button size="sm" loading={busyId === r.id} icon={<Check size={16} />} onClick={() => act(r.id, () => friendService().accept(r), 'Không chấp nhận được')}>
                  Chấp nhận
                </Button>
                <IconButton label="Từ chối" danger disabled={busyId === r.id} onClick={() => act(r.id, () => friendService().declineOrCancel(r), 'Không từ chối được')}>
                  <X size={17} />
                </IconButton>
              </Row>
            ))}
          </ul>
        </section>
      )}
      {outgoing.length > 0 && (
        <section>
          <h3 className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">Đã gửi — {outgoing.length}</h3>
          <ul className="space-y-0.5">
            {outgoing.map((r) => (
              <Row key={r.id} user={r.user} sub="Đang chờ họ chấp nhận">
                <Button variant="secondary" size="sm" loading={busyId === r.id} onClick={() => act(r.id, () => friendService().declineOrCancel(r), 'Không hủy được lời mời')}>
                  Hủy lời mời
                </Button>
              </Row>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AddFriend({ selfCard }: { selfCard?: ReactNode }) {
  const [form, setForm] = useState<AddFriendInput>({ displayName: '', userCode: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof AddFriendInput, string>>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validateAddFriend(form);
    setErrors(v);
    setServerError('');
    if (Object.keys(v).length > 0) return;
    setLoading(true);
    try {
      await friendService().sendRequestByTag(form);
      setForm({ displayName: '', userCode: '' });
    } catch (err) {
      setServerError(errorMessage(err, 'Không gửi được lời mời'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={submit} noValidate className="rounded-2xl border border-white/5 bg-ink-750 p-5">
        <h3 className="font-display text-lg font-bold text-white">Thêm bạn bằng tên và ID</h3>
        <p className="mb-4 mt-0.5 text-sm text-muted">
          Bạn phải biết <b className="text-slate-200">cả tên hiển thị lẫn ID</b> của người đó. Hãy nhờ họ xem ở góc dưới bên trái (rê chuột vào ảnh đại diện) hoặc trong Cài đặt.
        </p>
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Input
            label="Tên hiển thị"
            placeholder="Ví dụ: Hoàng Nam"
            autoComplete="off"
            value={form.displayName}
            error={errors.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            autoFocus
          />
          <Input
            label="ID (0–9999)"
            placeholder="0042"
            inputMode="numeric"
            autoComplete="off"
            maxLength={5}
            className="font-mono tracking-widest"
            value={form.userCode}
            error={errors.userCode}
            onChange={(e) => setForm({ ...form, userCode: e.target.value })}
          />
        </div>
        {serverError && (
          <div role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {serverError}
          </div>
        )}
        <Button type="submit" className="mt-4" loading={loading} icon={<Send size={16} />}>
          Gửi lời mời kết bạn
        </Button>
      </form>

      {selfCard ?? (
        <p className="flex items-center gap-2 px-1 text-sm text-muted">
          <IdCard size={16} className="text-brand-300" /> Tên và ID của bạn nằm ở Cài đặt người dùng.
        </p>
      )}
    </div>
  );
}

/** Trang Bạn bè: danh sách bạn, lời mời đang chờ, tìm và thêm bạn. */
export function FriendsView({
  renderFriendActions,
  selfCard,
}: {
  /** Slot: nút hành động cạnh mỗi người bạn (vd: "Nhắn tin" — do module Direct cấp qua composition root). */
  renderFriendActions?: (friend: Friend) => ReactNode;
  /** Slot: thẻ "Tên và ID của bạn" để chia sẻ cho bạn bè (do module Auth cấp). */
  selfCard?: ReactNode;
}) {
  const friends = useFriendStore((s) => s.friends);
  const incoming = useFriendStore((s) => s.incoming);
  const outgoing = useFriendStore((s) => s.outgoing);
  const loaded = useFriendStore((s) => s.loaded);
  const [tab, setTab] = useState<Tab>('all');

  const tabs: Array<{ id: Tab; label: string; badge?: number }> = [
    { id: 'all', label: 'Tất cả' },
    { id: 'pending', label: 'Đang chờ', badge: incoming.length },
    { id: 'add', label: 'Thêm bạn' },
  ];

  return (
    <div className="flex h-full w-full flex-col bg-ink-800">
      <header className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 border-b border-black/20 px-4 py-2 pl-14 md:pl-4">
        <span className="flex items-center gap-2 font-display text-[15px] font-bold text-white">
          <Users size={20} className="text-brand-300" /> Bạn bè
        </span>
        <span className="hidden h-5 w-px bg-white/10 sm:block" />
        <nav className="flex items-center gap-1" aria-label="Bộ lọc bạn bè">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                tab === t.id ? 'bg-brand-400/15 text-white' : 'text-muted hover:bg-white/5 hover:text-slate-200',
                t.id === 'add' && tab !== 'add' && 'text-brand-300',
              )}
            >
              {t.label}
              {!!t.badge && <span className="rounded-full bg-nova-500 px-1.5 text-[11px] font-bold leading-[18px] text-white">{t.badge}</span>}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-2xl">
          {!loaded ? (
            <div className="flex justify-center py-16">
              <Spinner size={26} className="text-brand-400" />
            </div>
          ) : tab === 'all' ? (
            <AllFriends friends={friends} renderActions={renderFriendActions} />
          ) : tab === 'pending' ? (
            <Pending incoming={incoming} outgoing={outgoing} />
          ) : (
            <AddFriend selfCard={selfCard} />
          )}
        </div>
      </div>
    </div>
  );
}
