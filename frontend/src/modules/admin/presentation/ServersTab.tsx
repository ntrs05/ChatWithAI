import { useState } from 'react';
import { toast } from '@/shared/event-bus';
import { errorMessage } from '@/shared/http';
import { formatDateTime } from '@/shared/lib';
import { Button, Input, Modal } from '@/shared/ui';
import { adminService } from '../module';
import type { AdminServer } from '../domain/models';
import { useLoad } from './useLoad';

export function ServersTab() {
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useLoad(() => adminService().listServers(q), [q]);
  const [target, setTarget] = useState<AdminServer | null>(null);
  const [busy, setBusy] = useState(false);

  const confirmDelete = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await adminService().deleteServer(target.id);
      toast.success(`Đã xóa server "${target.name}"`);
      setTarget(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="w-full max-w-sm">
        <Input placeholder="Tìm theo tên server…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {loading && !data && <p className="text-sm text-muted">Đang tải…</p>}
      {data && data.length === 0 && <p className="text-sm text-muted">Không có server nào.</p>}
      <ul className="divide-y divide-white/5 rounded-xl border border-white/5 bg-ink-850">
        {data?.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-white">{s.name}</p>
              <p className="text-xs text-muted">{s.memberCount} thành viên · tạo {formatDateTime(s.createdAt)}</p>
            </div>
            <Button size="sm" variant="danger" onClick={() => setTarget(s)}>Xóa server</Button>
          </li>
        ))}
      </ul>
      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="Xóa server?"
        description={`Toàn bộ kênh và tin nhắn của "${target?.name ?? ''}" sẽ bị xóa vĩnh viễn, không khôi phục được.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)}>Hủy</Button>
            <Button variant="danger" loading={busy} onClick={() => void confirmDelete()}>Xóa vĩnh viễn</Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">Hành động này được ghi vào nhật ký hệ thống.</p>
      </Modal>
    </section>
  );
}
