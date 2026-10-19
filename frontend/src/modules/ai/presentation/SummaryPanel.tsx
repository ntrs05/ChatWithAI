import type { ReactNode } from 'react';
import { useState } from 'react';
import { Check, ClipboardList, Copy, HelpCircle, Lightbulb, RefreshCw, Sparkles, X } from 'lucide-react';
import { art } from '@/shared/assets';
import { cn, formatDateTime } from '@/shared/lib';
import { Button, IconButton } from '@/shared/ui';
import { useAiStore } from '../application/aiStore';
import { SUMMARY_RANGES, summaryToText } from '../domain/models';
import { aiService } from '../module';

/** Nút "Tóm tắt AI" — được gắn vào header của ChatView qua slot. */
export function SummarizeButton({ channelId }: { channelId: string }) {
  const open = useAiStore((s) => s.panelOpen && s.channelId === channelId);
  return (
    <button
      onClick={() => (open ? aiService().close() : aiService().open(channelId))}
      aria-pressed={open}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition',
        open
          ? 'bg-gradient-to-r from-brand-400 to-aurora-400 text-ink-950'
          : 'bg-gradient-to-r from-brand-400/15 to-aurora-400/15 text-brand-200 hover:from-brand-400/25 hover:to-aurora-400/25',
      )}
    >
      <Sparkles size={16} />
      <span className="hidden sm:inline">Tóm tắt AI</span>
    </button>
  );
}

/** UC09 — Bảng hiển thị kết quả tóm tắt từ AI Service. */
export function SummaryPanel({ channelName }: { channelName: string }) {
  const { channelId, limit, status, summary, error } = useAiStore();
  const [copied, setCopied] = useState(false);
  if (!channelId) return null;

  const copy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summaryToText(summary, channelName));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard bị chặn */
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-brand-500/20 via-ink-800 to-aurora-500/20 px-4 pb-4 pt-3">
        <img src={art.robot} alt="" className="absolute -right-2 -top-1 h-20 w-20 opacity-90" />
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-950/60 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-200">
            <Sparkles size={12} /> AI Service
          </span>
          <IconButton label="Đóng" onClick={() => aiService().close()} className="relative">
            <X size={18} />
          </IconButton>
        </div>
        <h2 className="mt-2 font-display text-lg font-bold text-white">Tóm tắt #{channelName}</h2>
        <div className="relative mt-3 flex items-center gap-1.5">
          {SUMMARY_RANGES.map((n) => (
            <button
              key={n}
              onClick={() => void aiService().summarize(channelId, n)}
              disabled={status === 'loading'}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60',
                limit === n ? 'bg-brand-400 text-ink-950' : 'bg-ink-950/50 text-slate-300 hover:bg-ink-950/80',
              )}
            >
              {n} tin
            </button>
          ))}
          <IconButton
            label="Tạo lại"
            className="ml-auto"
            onClick={() => void aiService().summarize(channelId, limit)}
            disabled={status === 'loading'}
          >
            <RefreshCw size={16} className={status === 'loading' ? 'animate-spin' : ''} />
          </IconButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {status === 'loading' && (
          <div className="space-y-4" aria-busy="true">
            <p className="flex items-center gap-2 text-sm text-brand-200">
              <Sparkles size={16} className="animate-pulse" /> AI đang đọc {limit} tin nhắn gần nhất…
            </p>
            {[90, 75, 85, 60, 80].map((w, i) => (
              <div key={i} className="h-3 animate-pulse rounded bg-white/5" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <p className="font-semibold">Không tạo được bản tóm tắt</p>
            <p className="mt-1">{error}</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => void aiService().summarize(channelId, limit)}>
              Thử lại
            </Button>
          </div>
        )}

        {status === 'done' && summary && (
          <div className="animate-fade-in space-y-5 text-sm">
            <p className="leading-relaxed text-slate-200">{summary.overview}</p>

            {summary.participants.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {summary.participants.map((p) => (
                  <span key={p.name} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                    {p.name} · <b className="text-white">{p.count}</b>
                  </span>
                ))}
              </div>
            )}

            <Section icon={<Lightbulb size={15} />} title="Ý chính" items={summary.keyPoints} tone="text-amber-300" />
            <Section icon={<ClipboardList size={15} />} title="Việc cần làm / Mốc thời gian" items={summary.actionItems} tone="text-brand-300" />
            <Section icon={<HelpCircle size={15} />} title="Câu hỏi mở" items={summary.questions} tone="text-aurora-300" />

            <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-muted">
              <span>
                {summary.model}
                <br />
                {formatDateTime(summary.generatedAt)}
              </span>
              <Button size="sm" variant="secondary" onClick={copy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
                {copied ? 'Đã chép' : 'Sao chép'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, items, tone }: { icon: ReactNode; title: string; items: string[]; tone: string }) {
  if (!items.length) return null;
  return (
    <section>
      <h3 className={cn('mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider', tone)}>
        {icon} {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => {
          const [who, ...rest] = item.split(': ');
          return (
            <li key={i} className="rounded-lg bg-white/[0.03] px-3 py-2 leading-relaxed text-slate-300">
              {rest.length ? (
                <>
                  <b className="text-white">{who}:</b> {rest.join(': ')}
                </>
              ) : (
                item
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
