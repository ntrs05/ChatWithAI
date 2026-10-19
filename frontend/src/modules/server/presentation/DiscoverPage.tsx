import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Search, Users } from 'lucide-react';
import { art } from '@/shared/assets';
import { errorMessage } from '@/shared/http';
import { toast } from '@/shared/event-bus';
import { Button, Spinner } from '@/shared/ui';
import { useServerStore } from '../application/serverStore';
import type { Server } from '../domain/models';
import { serverService } from '../module';

const gradients = [
  'from-brand-500/60 to-aurora-500/50',
  'from-nova-500/50 to-aurora-500/50',
  'from-sky-500/50 to-brand-500/50',
  'from-amber-500/40 to-nova-500/50',
];

/** UC02 — Tham gia Server qua trang Khám phá. */
export function DiscoverPage() {
  const navigate = useNavigate();
  const myServers = useServerStore((s) => s.servers);
  const [servers, setServers] = useState<Server[] | null>(null);
  const [query, setQuery] = useState('');
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    serverService()
      .listPublicServers()
      .then(setServers)
      .catch((err) => {
        toast.error(errorMessage(err));
        setServers([]);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (servers ?? []).filter((s) => !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  }, [servers, query]);

  const join = async (server: Server) => {
    setJoining(server.id);
    try {
      await serverService().joinPublic(server.id);
      toast.success(`Đã tham gia "${server.name}"`);
      navigate(`/app/${server.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-ink-800">
      <header className="relative overflow-hidden px-6 py-12 sm:px-10">
        <div className="starfield absolute inset-0 opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/30 via-transparent to-aurora-500/30" />
        <img src={art.rocket} alt="" className="absolute right-10 top-6 hidden w-28 animate-float [--r:-12deg] md:block" />
        <img src={art.planet} alt="" className="absolute bottom-2 right-48 hidden w-20 animate-float [animation-delay:1s] lg:block" />
        <div className="relative max-w-xl">
          <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
            Tìm <span className="text-gradient">cộng đồng</span> dành cho bạn
          </h1>
          <p className="mt-2 text-slate-300">Từ lớp học, CLB đến hội game thủ — tất cả đều ở đây.</p>
          <label className="mt-6 flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-ink-950/70 px-4 focus-within:border-brand-400">
            <Search size={18} className="text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm server…"
              className="flex-1 bg-transparent text-[15px] text-white placeholder:text-slate-500 focus:outline-none"
            />
          </label>
        </div>
      </header>

      <section className="px-6 pb-12 sm:px-10">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">Server công khai</h2>
        {!servers ? (
          <div className="flex justify-center py-16">
            <Spinner className="text-brand-400" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-muted">Không tìm thấy server phù hợp.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s, i) => {
              const joined = myServers.some((m) => m.id === s.id);
              return (
                <article key={s.id} className="group overflow-hidden rounded-2xl border border-white/5 bg-ink-750 transition hover:-translate-y-1 hover:border-brand-400/40 hover:shadow-glow">
                  <div className={`relative h-24 bg-gradient-to-br ${gradients[i % gradients.length]}`}>
                    <div className="absolute -bottom-7 left-4 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-ink-750 bg-ink-700">
                      <img src={s.iconUrl} alt="" className="h-10 w-10" />
                    </div>
                  </div>
                  <div className="px-4 pb-4 pt-9">
                    <h3 className="font-display text-lg font-bold text-white">{s.name}</h3>
                    <p className="mt-1 line-clamp-2 min-h-[40px] text-sm text-slate-400">{s.description || 'Chưa có mô tả.'}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                        <Users size={14} /> {s.memberCount ?? 0} thành viên
                      </span>
                      {joined ? (
                        <Button size="sm" variant="secondary" icon={<Check size={15} />} onClick={() => navigate(`/app/${s.id}`)}>
                          Đã tham gia
                        </Button>
                      ) : (
                        <Button size="sm" loading={joining === s.id} onClick={() => join(s)}>
                          Tham gia
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
