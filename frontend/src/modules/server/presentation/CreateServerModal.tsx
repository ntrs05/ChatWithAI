import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Lock, Sparkles, Ticket } from 'lucide-react';
import { serverIcons } from '@/shared/assets';
import { errorMessage } from '@/shared/http';
import { cn } from '@/shared/lib';
import { Button, Input, Modal, Textarea } from '@/shared/ui';
import { serverService } from '../module';

type Tab = 'create' | 'join';

export function CreateServerModal({ open, onClose, initialTab = 'create' }: { open: boolean; onClose: () => void; initialTab?: Tab }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState(serverIcons[0]);
  const [isPublic, setIsPublic] = useState(true);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const close = () => {
    setError('');
    setName('');
    setDescription('');
    setCode('');
    setTab(initialTab);
    onClose();
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const server =
        tab === 'create'
          ? await serverService().createServer({ name, description, iconUrl, isPublic })
          : await serverService().joinByInvite(code);
      close();
      navigate(`/app/${server.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={tab === 'create' ? 'Tạo server của bạn' : 'Tham gia một server'}
      description={
        tab === 'create'
          ? 'Server là nơi bạn và bạn bè cùng trò chuyện. Bạn sẽ là quản trị viên của server này.'
          : 'Nhập mã mời mà bạn bè đã gửi cho bạn (ví dụ: KTPM2026).'
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-ink-950/60 p-1">
        {(['create', 'join'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setError('');
            }}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition',
              tab === t ? 'bg-ink-600 text-white' : 'text-muted hover:text-white',
            )}
          >
            {t === 'create' ? <Sparkles size={16} /> : <Ticket size={16} />}
            {t === 'create' ? 'Tạo mới' : 'Dùng mã mời'}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {tab === 'create' ? (
          <>
            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-300">Biểu tượng</span>
              <div className="grid grid-cols-8 gap-2">
                {serverIcons.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setIconUrl(src)}
                    aria-pressed={iconUrl === src}
                    aria-label="Chọn biểu tượng"
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-xl border-2 bg-ink-900 transition',
                      iconUrl === src ? 'border-brand-400 bg-ink-700' : 'border-transparent hover:border-ink-500',
                    )}
                  >
                    <img src={src} alt="" className="h-8 w-8" />
                  </button>
                ))}
              </div>
            </div>
            <Input label="Tên server" placeholder="Ví dụ: Nhóm đồ án KTPM" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <Textarea
              label="Mô tả (không bắt buộc)"
              rows={2}
              placeholder="Server này dùng để…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: true, icon: Globe, title: 'Công khai', hint: 'Hiện ở trang Khám phá' },
                { value: false, icon: Lock, title: 'Riêng tư', hint: 'Chỉ vào bằng mã mời' },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setIsPublic(opt.value)}
                  className={cn(
                    'flex items-start gap-2.5 rounded-xl border p-3 text-left transition',
                    isPublic === opt.value ? 'border-brand-400 bg-brand-400/10' : 'border-ink-600 hover:border-ink-500',
                  )}
                >
                  <opt.icon size={18} className="mt-0.5 text-brand-300" />
                  <span>
                    <span className="block text-sm font-semibold">{opt.title}</span>
                    <span className="block text-xs text-muted">{opt.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <Input
            label="Mã mời"
            placeholder="KTPM2026"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono uppercase tracking-widest"
            autoFocus
          />
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={close}>
            Huỷ
          </Button>
          <Button type="submit" loading={loading}>
            {tab === 'create' ? 'Tạo server' : 'Tham gia'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
