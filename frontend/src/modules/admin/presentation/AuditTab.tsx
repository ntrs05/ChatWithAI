import { useState } from 'react';
import { formatDateTime } from '@/shared/lib';
import { Button, Input } from '@/shared/ui';
import { AUDIT_PAGE_SIZE } from '../application/AdminService';
import { adminService } from '../module';
import { useLoad } from './useLoad';

export function AuditTab() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(0);
  const { data, error, loading } = useLoad(() => adminService().listAuditLogs(action, page), [action, page]);

  return (
    <section className="space-y-4">
      <div className="w-full max-w-sm">
        <Input
          placeholder="Lọc theo hành động (VD: UserLocked)…"
          value={action}
          onChange={(e) => (setAction(e.target.value), setPage(0))}
        />
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {loading && !data && <p className="text-sm text-muted">Đang tải…</p>}
      {data && data.length === 0 && <p className="text-sm text-muted">Chưa có nhật ký nào.</p>}
      <div className="overflow-x-auto rounded-xl border border-white/5 bg-ink-850">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="p-3">Thời gian</th>
              <th className="p-3">Hành động</th>
              <th className="p-3">Đối tượng</th>
              <th className="p-3">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data?.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap p-3 text-slate-300">{formatDateTime(l.createdAt)}</td>
                <td className="p-3 font-medium text-white">{l.action}</td>
                <td className="p-3 text-slate-300">{l.targetType}</td>
                <td className="p-3 text-slate-300">{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Trang trước</Button>
        <span className="text-sm text-muted">Trang {page + 1}</span>
        <Button size="sm" variant="secondary" disabled={!data || data.length < AUDIT_PAGE_SIZE} onClick={() => setPage(page + 1)}>Trang sau</Button>
      </div>
    </section>
  );
}
