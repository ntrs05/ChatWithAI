import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Sparkles, Ticket } from 'lucide-react';
import { art } from '@/shared/assets';
import { useServerStore } from '../application/serverStore';
import { CreateServerModal } from './CreateServerModal';

/** Trang chủ trong ứng dụng: lối tắt Tạo / Tham gia / Khám phá server. */
export function HomeView({ displayName }: { displayName: string }) {
  const navigate = useNavigate();
  const servers = useServerStore((s) => s.servers);
  const [modal, setModal] = useState<'create' | 'join' | null>(null);

  const actions = [
    { icon: Sparkles, title: 'Tạo server', desc: 'Lập không gian riêng cho nhóm của bạn', img: art.rocket, onClick: () => setModal('create') },
    { icon: Ticket, title: 'Tham gia bằng mã mời', desc: 'Nhập mã bạn bè gửi cho bạn', img: art.megaphone, onClick: () => setModal('join') },
    { icon: Compass, title: 'Khám phá server', desc: 'Tìm các cộng đồng công khai', img: art.planet, onClick: () => navigate('/app/discover') },
  ];

  return (
    <div className="h-full overflow-y-auto bg-ink-800">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-center gap-5">
          <img src={art.robot} alt="" className="h-20 w-20 animate-float" />
          <div>
            <h1 className="font-display text-3xl font-extrabold text-white">Xin chào, {displayName}!</h1>
            <p className="mt-1 text-slate-400">Hôm nay bạn muốn trò chuyện ở đâu?</p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {actions.map((a) => (
            <button
              key={a.title}
              onClick={a.onClick}
              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-ink-750 p-5 text-left transition hover:-translate-y-1 hover:border-brand-400/40 hover:shadow-glow"
            >
              <img src={a.img} alt="" className="absolute -right-4 -top-4 h-24 w-24 opacity-80 transition group-hover:rotate-6 group-hover:scale-110" />
              <a.icon size={22} className="text-brand-300" />
              <h3 className="mt-6 font-display text-lg font-bold text-white">{a.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{a.desc}</p>
            </button>
          ))}
        </div>

        {servers.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Server của bạn</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {servers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/app/${s.id}`)}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-ink-750 p-3 text-left hover:bg-ink-700"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-600">
                    <img src={s.iconUrl} alt="" className="h-7 w-7" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-white">{s.name}</span>
                    <span className="block truncate text-xs text-muted">{s.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
      <CreateServerModal open={modal !== null} initialTab={modal ?? 'create'} onClose={() => setModal(null)} key={modal ?? 'none'} />
    </div>
  );
}
