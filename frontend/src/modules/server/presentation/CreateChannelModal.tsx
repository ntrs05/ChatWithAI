import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Lock, ShieldCheck, Volume2 } from 'lucide-react';
import { errorMessage } from '@/shared/http';
import { cn } from '@/shared/lib';
import { Avatar, Button, Input, Modal } from '@/shared/ui';
import { useServerStore } from '../application/serverStore';
import type { ChannelType } from '../domain/models';
import { normalizeChannelName } from '../domain/rules';
import { serverService } from '../module';

interface Props {
  serverId: string;
  open: boolean;
  defaultType?: ChannelType;
  onClose: () => void;
}

/** UC03 — Tạo Kênh (Text / Voice). Chỉ hiển thị cho Admin. */
export function CreateChannelModal({ serverId, open, defaultType = 'text', onClose }: Props) {
  const navigate = useNavigate();
  const [type, setType] = useState<ChannelType>(defaultType);
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const members = useServerStore((s) => s.members[serverId]) ?? [];
  const meId = useServerStore((s) => s.meId);

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setName('');
      setTopic('');
      setError('');
      setIsPrivate(false);
      setPicked([]);
    }
  }, [open, defaultType]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const channel = await serverService().createChannel(serverId, { name, type, topic, isPrivate, memberIds: picked });
      onClose();
      if (channel.type === 'text') navigate(`/app/${serverId}/${channel.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const preview = normalizeChannelName(name || (type === 'text' ? 'kênh-mới' : 'Phòng thoại mới'), type);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo kênh"
      description={
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-nova-400" /> Quyền dành cho quản trị viên
        </span>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <span className="block text-xs font-bold uppercase tracking-wide text-slate-300">Loại kênh</span>
          {(
            [
              { value: 'text', icon: Hash, title: 'Văn bản', hint: 'Gửi tin nhắn, hình ảnh, file' },
              { value: 'voice', icon: Volume2, title: 'Thoại', hint: 'Trò chuyện bằng giọng nói (WebRTC)' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              aria-pressed={type === opt.value}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
                type === opt.value ? 'border-brand-400 bg-brand-400/10' : 'border-ink-600 bg-ink-900/50 hover:border-ink-500',
              )}
            >
              <opt.icon size={22} className="text-slate-300" />
              <span className="flex-1">
                <span className="block font-semibold">{opt.title}</span>
                <span className="block text-xs text-muted">{opt.hint}</span>
              </span>
              <span
                className={cn(
                  'h-5 w-5 rounded-full border-2',
                  type === opt.value ? 'border-brand-400 bg-brand-400 shadow-[inset_0_0_0_3px_#16213A]' : 'border-ink-500',
                )}
              />
            </button>
          ))}
        </div>
        <Input
          label="Tên kênh"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === 'text' ? 'kênh-mới' : 'Phòng thoại mới'}
          hint={
            <span className="inline-flex items-center gap-1">
              Hiển thị: {type === 'text' ? <Hash size={12} /> : <Volume2 size={12} />}
              <b className="text-slate-200">{preview}</b>
            </span>
          }
          autoFocus
        />
        {type === 'text' && (
          <Input label="Chủ đề (không bắt buộc)" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Kênh này dùng để…" />
        )}
        <label className="flex items-center gap-3 rounded-xl border border-ink-600 bg-ink-900/50 p-3">
          <Lock size={18} className="text-slate-300" />
          <span className="flex-1">
            <span className="block text-sm font-semibold">Kênh riêng tư</span>
            <span className="block text-xs text-muted">Chỉ chủ server và người bạn chọn mới thấy kênh này.</span>
          </span>
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} aria-label="Kênh riêng tư" className="h-5 w-5 accent-brand-400" />
        </label>
        {isPrivate && (
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-ink-600 p-2">
            {members
              .filter((m) => m.user.id !== meId)
              .map((m) => (
                <li key={m.user.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-white/5">
                    <input
                      type="checkbox"
                      className="accent-brand-400"
                      checked={picked.includes(m.user.id)}
                      onChange={(e) => setPicked((list) => (e.target.checked ? [...list, m.user.id] : list.filter((id) => id !== m.user.id)))}
                    />
                    <Avatar src={m.user.avatarUrl} name={m.user.displayName} size={24} />
                    <span className="truncate text-sm">{m.user.displayName}</span>
                  </label>
                </li>
              ))}
            {members.filter((m) => m.user.id !== meId).length === 0 && <li className="px-2 py-1 text-sm text-muted">Server chưa có thành viên khác.</li>}
          </ul>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" loading={loading}>
            Tạo kênh
          </Button>
        </div>
      </form>
    </Modal>
  );
}
