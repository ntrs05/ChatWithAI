import { useState } from 'react';
import { toast } from '@/shared/event-bus';
import { errorMessage } from '@/shared/http';
import { formatBytes, formatDateTime } from '@/shared/lib';
import { Avatar, Button, Input } from '@/shared/ui';
import { adminService } from '../module';
import type { AdminUser } from '../domain/models';
import { quotaPercent } from '../domain/rules';
import { useLoad } from './useLoad';

export function UsersTab() {
  const [q, setQ] = useState('');
  const [onlyLocked, setOnlyLocked] = useState(false);
  const { data, error, loading, reload } = useLoad(() => adminService().listUsers(q, onlyLocked ? true : undefined), [q, onlyLocked]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm">
          <Input placeholder="Tìm theo tên hoặc email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={onlyLocked} onChange={(e) => setOnlyLocked(e.target.checked)} /> Chỉ tài khoản đang bị khóa
        </label>
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {loading && !data && <p className="text-sm text-muted">Đang tải…</p>}
      {data && data.length === 0 && <p className="text-sm text-muted">Không có người dùng nào.</p>}
      <ul className="divide-y divide-white/5 rounded-xl border border-white/5 bg-ink-850">
        {data?.map((u) => <UserRow key={u.id} user={u} onChanged={reload} />)}
      </ul>
    </section>
  );
}

function UserRow({ user, onChanged }: { user: AdminUser; onChanged: () => void }) {
  const [panel, setPanel] = useState<'none' | 'lock' | 'quota'>('none');
  return (
    <li className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar src={user.avatarUrl} name={user.displayName} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">
            {user.displayName}
            {user.isAdmin && <span className="ml-2 rounded bg-brand-400/20 px-1.5 text-[11px] font-bold text-brand-200">ADMIN</span>}
            {user.isLocked && <span className="ml-2 rounded bg-rose-500/20 px-1.5 text-[11px] font-bold text-rose-300">ĐÃ KHÓA</span>}
          </p>
          <p className="truncate text-xs text-muted">
            {user.email} · tham gia {formatDateTime(user.createdAt)}
            {user.isLocked && user.lockedReason ? ` · lý do: ${user.lockedReason}` : ''}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setPanel(panel === 'quota' ? 'none' : 'quota')}>Dung lượng</Button>
        {user.isLocked ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              void adminService().unlockUser(user.id).then(() => (toast.success('Đã mở khóa tài khoản'), onChanged())).catch((e) => toast.error(errorMessage(e)))
            }
          >
            Mở khóa
          </Button>
        ) : (
          !user.isAdmin && <Button size="sm" variant="danger" onClick={() => setPanel(panel === 'lock' ? 'none' : 'lock')}>Khóa</Button>
        )}
      </div>
      {panel === 'lock' && <LockForm user={user} onDone={() => (setPanel('none'), onChanged())} />}
      {panel === 'quota' && <QuotaForm user={user} onDone={() => setPanel('none')} />}
    </li>
  );
}

function LockForm({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await adminService().lockUser(user.id, reason);
      toast.success(`Đã khóa ${user.displayName}`);
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg bg-ink-900 p-3">
      <div className="min-w-[220px] flex-1">
        <Input label="Lý do khóa" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Spam, vi phạm nội quy…" />
      </div>
      <Button size="sm" variant="danger" loading={busy} onClick={() => void submit()}>Xác nhận khóa</Button>
    </div>
  );
}

function QuotaForm({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const { data, error, reload } = useLoad(() => adminService().getQuota(user.id), [user.id]);
  const [mb, setMb] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await adminService().setQuota(user.id, mb);
      toast.success('Đã cập nhật hạn mức');
      setMb('');
      reload();
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const pct = data ? quotaPercent(data.usedBytes, data.limitBytes) : 0;
  return (
    <div className="space-y-3 rounded-lg bg-ink-900 p-3">
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {data && (
        <div>
          <p className="text-sm text-slate-300">Đã dùng {formatBytes(data.usedBytes)} / {formatBytes(data.limitBytes)} ({pct}%)</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-700">
            <div className="h-full bg-brand-400" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-40">
          <Input label="Hạn mức mới (MB)" inputMode="numeric" value={mb} onChange={(e) => setMb(e.target.value)} />
        </div>
        <Button size="sm" loading={busy} disabled={!mb.trim()} onClick={() => void save()}>Lưu</Button>
      </div>
    </div>
  );
}
