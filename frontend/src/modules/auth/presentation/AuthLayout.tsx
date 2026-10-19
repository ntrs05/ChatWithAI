import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { art } from '@/shared/assets';
import { Logo } from '@/shared/ui';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-ink-950 text-slate-100">
      <div className="starfield pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute -left-40 top-1/3 h-[480px] w-[480px] rounded-full bg-brand-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-[420px] w-[420px] rounded-full bg-aurora-500/25 blur-[120px]" />

      {/* Cột minh hoạ */}
      <aside className="relative hidden flex-1 flex-col justify-between p-12 lg:flex">
        <Link to="/" className="text-white">
          <Logo size={36} />
        </Link>
        <div className="relative max-w-lg">
          <img src={art.headphone} alt="" className="absolute -right-6 -top-28 w-32 animate-float [--r:12deg]" />
          <img src={art.speechBalloon} alt="" className="absolute -left-4 -top-16 w-20 animate-float [--r:-10deg] [animation-delay:1.2s]" />
          <h1 className="font-display text-5xl font-extrabold leading-tight">
            Nơi nhóm bạn <span className="text-gradient">trò chuyện</span>, gọi thoại và cùng nhau làm việc.
          </h1>
          <p className="mt-5 text-lg text-slate-300">
            Nhắn tin thời gian thực, phòng thoại WebRTC và AI tóm tắt những gì bạn đã bỏ lỡ.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted">
          <img src={art.robot} alt="" className="w-14" />
          <span>Nebula — Chat, Voice & AI trong một nơi</span>
        </div>
      </aside>

      {/* Cột form */}
      <main className="relative flex w-full items-center justify-center px-4 py-10 lg:w-[540px] lg:px-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex justify-center text-white lg:hidden">
            <Logo size={34} />
          </Link>
          <div className="rounded-3xl border border-white/10 bg-ink-800/80 p-8 shadow-2xl backdrop-blur-xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
