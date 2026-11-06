import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { errorMessage } from '@/shared/http';
import { Button, Modal } from '@/shared/ui';
import { useServerStore, selectMyRole } from '../application/serverStore';
import type { Server } from '../domain/models';
import { serverService } from '../module';

/** Xác nhận rời server. Chủ server không rời được (phải giao quyền trước) nên hiện lý do thay vì nút. */
export function LeaveServerModal({ server, open, onClose }: { server: Server; open: boolean; onClose: () => void }) {
  const role = useServerStore(selectMyRole(server.id));
  const isOwner = role === 'owner';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const leave = async () => {
    setBusy(true);
    setError('');
    try {
      await serverService().leaveServer(server.id);
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Không rời được server'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`Rời khỏi ${server.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          {!isOwner && (
            <Button variant="danger" loading={busy} onClick={() => void leave()}>
              Rời server
            </Button>
          )}
        </>
      }
    >
      {isOwner ? (
        <div className="flex gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          <TriangleAlert size={20} className="mt-0.5 shrink-0 text-amber-300" />
          <p>
            Bạn là <b>chủ server</b> của server này nên chưa thể rời. Hãy giao quyền chủ server cho một thành viên khác trước.
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-300">
          Bạn có chắc muốn rời <b className="text-white">{server.name}</b>? Bạn sẽ không còn thấy các kênh của server này cho đến khi được mời lại hoặc
          nhập lại mã mời.
        </p>
      )}
      {error && (
        <div role="alert" className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}
    </Modal>
  );
}
