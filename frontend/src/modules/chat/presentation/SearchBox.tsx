import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { errorMessage } from '@/shared/http';
import { formatDateTime } from '@/shared/lib';
import { Avatar, Spinner } from '@/shared/ui';
import type { Message } from '../domain/models';
import { chatService } from '../module';
import { MessageContent } from './MessageContent';

/** UC05 — Tìm kiếm trong lịch sử tin nhắn của kênh. */
export function SearchBox({ channelId }: { channelId: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery('');
    setResults(null);
  }, [channelId]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      chatService()
        .search(channelId, q)
        .then((r) => {
          setResults(r);
          setError('');
        })
        .catch((err) => setError(errorMessage(err)))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, channelId]);

  useEffect(() => {
    if (results === null) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setResults(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [results]);

  const jump = async (m: Message) => {
    setResults(null);
    await chatService().ensureLoaded(channelId, m.id);
    requestAnimationFrame(() => {
      const el = document.getElementById(`msg-${m.id}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1600);
    });
  };

  return (
    <div ref={boxRef} className="relative">
      <label className="flex h-8 w-40 items-center gap-1.5 rounded-lg bg-ink-950/70 px-2 text-sm transition-all focus-within:w-56 lg:w-48 lg:focus-within:w-64">
        <Search size={15} className="shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm tin nhắn"
          aria-label="Tìm trong lịch sử tin nhắn"
          className="min-w-0 flex-1 bg-transparent text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
        {loading ? (
          <Spinner size={14} className="text-muted" />
        ) : (
          query && (
            <button onClick={() => setQuery('')} aria-label="Xoá tìm kiếm" className="text-muted hover:text-white">
              <X size={14} />
            </button>
          )
        )}
      </label>
      {(results || error) && (
        <div className="absolute right-0 top-10 z-30 w-[min(420px,90vw)] animate-fade-in overflow-hidden rounded-xl border border-white/10 bg-ink-950 shadow-2xl">
          <div className="border-b border-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
            {error ? 'Lỗi' : `${results!.length} kết quả`}
          </div>
          <div className="max-h-96 overflow-y-auto p-1.5">
            {error && <p className="p-3 text-sm text-rose-300">{error}</p>}
            {results?.length === 0 && <p className="p-6 text-center text-sm text-muted">Không tìm thấy tin nhắn nào.</p>}
            {results?.map((m) => (
              <button key={m.id} onClick={() => void jump(m)} className="flex w-full gap-2.5 rounded-lg p-2.5 text-left hover:bg-white/5">
                <Avatar src={m.author.avatarUrl} name={m.author.displayName} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-white">{m.author.displayName}</span>
                    <span className="text-[11px] text-muted">{formatDateTime(m.createdAt)}</span>
                  </span>
                  <span className="line-clamp-2 text-sm text-slate-300">
                    <MessageContent text={m.content || '📎 Tệp đính kèm'} highlight={query.trim()} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
