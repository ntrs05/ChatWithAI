import { useEffect, useState } from 'react';
import { Lock, UserMinus, UserPlus } from 'lucide-react';
import { toast } from '@/shared/event-bus';
import { errorMessage } from '@/shared/http';
import { Avatar, Button, Modal } from '@/shared/ui';
import type { UserProfile } from '@/shared/types';
import { useServerStore } from '../application/serverStore';
import type { Channel } from '../domain/models';
import { serverService } from '../module';

interface Props {
  channel: Channel;
  onClose: () => void;
}

/** Chủ server: đổi kênh sang riêng tư / công khai và chọn ai được vào kênh riêng tư. */
export function ChannelAccessModal({ channel, onClose }: Props) {
  const members = useServerStore((s) => s.members[channel.serverId]) ?? [];
  const meId = useServerStore((s) => s.meId);
  const current = useServerStore((s) => s.channels[channel.serverId]?.find((c) => c.id === channel.id)) ?? channel;
  const isPrivate = current.isPrivate ?? false;
  const [allowed, setAllowed] = useState<UserProfile[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPrivate) return setAllowed([]);
    serverService()
      .listChannelMembers(channel.id)
      .then(setAllowed)
      .catch((err) => toast.error(errorMessage(err)));
  }, [channel.id, isPrivate]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const allowedIds = new Set(allowed.map((u) => u.id));
  const candidates = members.filter((m) => !allowedIds.has(m.user.id));

  return (
    <Modal open onClose={onClose} title={`Quyền truy cập #${channel.name}`}>
      <div className="space-y-4">
        <label className="flex items-center gap-3 rounded-xl border border-ink-600 bg-ink-900/50 p-3">
          <Lock size={20} className="text-slate-300" />
          <span className="flex-1">
            <span className="block font-semibold">Kênh riêng tư</span>
            <span className="block text-xs text-muted">Chỉ chủ server và những người bạn chọn mới thấy và đọc được kênh này.</span>
          </span>
          <input
            type="checkbox"
            checked={isPrivate}
            disabled={busy}
            onChange={(e) => void run(() => serverService().setChannelPrivacy(current, e.target.checked))}
            aria-label="Kênh riêng tư"
            className="h-5 w-5 accent-brand-400"
          />
        </label>

        {isPrivate && (
          <>
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">Đang được vào ({allowed.length})</h3>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {allowed.map((u) => (
                  <li key={u.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/5">
                    <Avatar src={u.avatarUrl} name={u.displayName} size={28} />
                    <span className="flex-1 truncate text-sm">{u.displayName}</span>
                    {u.id !== meId && (
                      <button
                        aria-label={`Bỏ ${u.displayName} khỏi kênh`}
                        title="Bỏ khỏi kênh"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await serverService().removeChannelMember(channel.id, u.id);
                            setAllowed((list) => list.filter((x) => x.id !== u.id));
                          })
                        }
                        className="rounded p-1 text-muted hover:text-rose-300"
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">Thêm thành viên</h3>
              {candidates.length === 0 ? (
                <p className="text-sm text-muted">Mọi thành viên server đều đã được vào.</p>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {candidates.map((m) => (
                    <li key={m.user.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/5">
                      <Avatar src={m.user.avatarUrl} name={m.user.displayName} size={28} />
                      <span className="flex-1 truncate text-sm">{m.user.displayName}</span>
                      <button
                        aria-label={`Thêm ${m.user.displayName} vào kênh`}
                        title="Thêm vào kênh"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await serverService().addChannelMember(channel.id, m.user.id);
                            setAllowed((list) => [...list, m.user]);
                          })
                        }
                        className="rounded p-1 text-muted hover:text-emerald-300"
                      >
                        <UserPlus size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
}
