import { useEffect, useState } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { bus, type AppEvents } from '../event-bus';
import { cn, uid } from '../lib';

type Toast = AppEvents['ui.toast'] & { id: string };

/** Subscriber của sự kiện 'ui.toast' — bất kỳ module nào cũng có thể publish thông báo. */
export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(
    () =>
      bus.subscribe('ui.toast', (t) => {
        const id = uid();
        setItems((prev) => [...prev.slice(-3), { ...t, id }]);
        setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 3800);
      }),
    [],
  );

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:left-auto sm:right-4 sm:translate-x-0 sm:px-0">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'pointer-events-auto flex animate-fade-in items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur',
            t.kind === 'error' && 'border-rose-400/40 bg-rose-950/90 text-rose-100',
            t.kind === 'success' && 'border-brand-400/40 bg-ink-800/95 text-slate-100',
            t.kind === 'info' && 'border-ink-500 bg-ink-800/95 text-slate-100',
          )}
        >
          {t.kind === 'error' ? (
            <XCircle size={18} className="mt-px shrink-0 text-rose-300" />
          ) : t.kind === 'success' ? (
            <CheckCircle2 size={18} className="mt-px shrink-0 text-brand-300" />
          ) : (
            <Info size={18} className="mt-px shrink-0 text-aurora-300" />
          )}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
