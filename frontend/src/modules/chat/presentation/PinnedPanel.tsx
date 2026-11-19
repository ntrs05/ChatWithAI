import { useEffect, useRef, useState } from 'react';
import { Pin, PinOff, X } from 'lucide-react';
import { toast } from '@/shared/event-bus';
import { errorMessage } from '@/shared/http';
import { formatDateTime } from '@/shared/lib';
import { Avatar, IconButton, Spinner } from '@/shared/ui';
import { useChatStore } from '../application/chatStore';
import { stripMentions } from '../domain/rules';
import { chatService } from '../module';

const EMPTY: never[] = [];

/** Nút "Tin đã ghim" ở thanh tiêu đề + khung danh sách. Bấm một tin để cuộn tới đó. */
export function PinnedButton({ channelId, canUnpin }: { channelId: string; canUnpin: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pins = useChatStore((s) => s.pins[channelId]) ?? EMPTY;
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [channelId]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    chatService()
      .loadPins(channelId)
      .catch((err) => toast.error(errorMessage(err, 'Không tải được tin đã ghim')))
      .finally(() => setLoading(false));
    const onDown = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, channelId]);

  const jump = async (id: string) => {
    setOpen(false);
    await chatService().ensureLoaded(channelId, id);
    requestAnimationFrame(() => {
      const el = document.getElementById(`msg-${id}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1600);
    });
  };

  return (
    <div ref={boxRef} className="relative">
      <IconButton label="Tin đã ghim" active={open} onClick={() => setOpen((v) => !v)}>
        <Pin size={19} />
      </IconButton>
      {open && (
        <div role="dialog" aria-label="Tin đã ghim" className="absolute right-0 top-full z-30 mt-2 w-[min(380px,92vw)] animate-fade-in rounded-2xl border border-white/10 bg-ink-950 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <Pin size={16} className="text-amber-300" />
            <h2 className="flex-1 font-display text-sm font-bold text-white">Tin đã ghim</h2>
            <IconButton label="Đóng" onClick={() => setOpen(false)}>
              <X size={16} />
            </IconButton>
          </div>
          <div className="max-h-[55vh] overflow-y-auto p-2">
            {loading && pins.length === 0 ? (
              <div className="flex justify-center py-8">
                <Spinner className="text-brand-300" />
              </div>
            ) : pins.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted">Chưa có tin nào được ghim.</p>
            ) : (
              <ul className="space-y-1.5">
                {pins.map((m) => (
                  <li key={m.id} className="group rounded-xl border border-white/5 bg-ink-800/70 p-3 hover:border-white/15">
                    <div className="flex items-center gap-2">
                      <Avatar src={m.author.avatarUrl} name={m.author.displayName} size={22} />
                      <span className="truncate text-sm font-semibold text-white">{m.author.displayName}</span>
                      <time className="ml-auto shrink-0 text-[11px] text-muted">{formatDateTime(m.createdAt)}</time>
                    </div>
                    <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap break-words text-sm text-slate-300">{stripMentions(m.content) || '(tệp đính kèm)'}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <button onClick={() => void jump(m.id)} className="font-semibold text-brand-300 hover:underline">
                        Đi tới tin nhắn
                      </button>
                      {canUnpin && (
                        <button
                          onClick={() => void chatService().setPinned(m, false).catch((err) => toast.error(errorMessage(err, 'Không bỏ ghim được')))}
                          className="inline-flex items-center gap-1 font-semibold text-rose-300 hover:underline"
                        >
                          <PinOff size={12} /> Bỏ ghim
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
