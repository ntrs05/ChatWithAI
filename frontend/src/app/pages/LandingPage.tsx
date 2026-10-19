import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Boxes,
  FileUp,
  Hash,
  History,
  Layers,
  Mic,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
  Volume2,
} from 'lucide-react';
import { useAuthStore } from '@/modules/auth';
import { art, avatars, serverIcons } from '@/shared/assets';
import { Logo } from '@/shared/ui';

function Cta({ className = '' }: { className?: string }) {
  const authed = useAuthStore((s) => s.status === 'authenticated');
  return (
    <Link
      to={authed ? '/app' : '/login'}
      className={`inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-ink-950 shadow-lg transition hover:-translate-y-0.5 hover:shadow-glow ${className}`}
    >
      Mở Nebula trên trình duyệt <ArrowRight size={18} />
    </Link>
  );
}

/** Mô phỏng giao diện ứng dụng (vẽ bằng HTML, không dùng ảnh chụp). */
function AppPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <img src={art.headphone} alt="" className="absolute -left-10 -top-12 z-10 w-24 animate-float [--r:-14deg] sm:w-28" />
      <img src={art.rocket} alt="" className="absolute -right-6 -top-10 z-10 w-20 animate-float [--r:10deg] [animation-delay:1.4s] sm:w-24" />
      <img src={art.robot} alt="" className="absolute -bottom-10 -right-8 z-10 w-24 animate-float [animation-delay:.7s] sm:w-32" />

      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-ink-900/90 shadow-[0_30px_80px_-20px_rgba(45,212,191,.35)] backdrop-blur">
        <div className="flex h-8 items-center gap-1.5 border-b border-white/5 px-4">
          {['bg-rose-400', 'bg-amber-300', 'bg-emerald-400'].map((c) => (
            <span key={c} className={`h-2.5 w-2.5 rounded-full ${c}`} />
          ))}
        </div>
        <div className="flex h-[300px] sm:h-[340px]">
          <div className="flex w-14 flex-col items-center gap-2 bg-ink-950 py-3">
            {serverIcons.slice(0, 5).map((src, i) => (
              <span key={src} className={`flex h-10 w-10 items-center justify-center rounded-xl ${i === 1 ? 'bg-ink-600 ring-2 ring-brand-400' : 'bg-ink-750'}`}>
                <img src={src} alt="" className="h-6 w-6" />
              </span>
            ))}
          </div>
          <div className="hidden w-40 flex-col gap-1 bg-ink-850 p-3 text-xs text-muted sm:flex">
            <span className="mb-1 font-bold uppercase tracking-wider">Kênh văn bản</span>
            <span className="flex items-center gap-1 rounded-md bg-brand-400/15 px-2 py-1 text-white"><Hash size={12} /> thảo-luận</span>
            <span className="flex items-center gap-1 px-2 py-1"><Hash size={12} /> tài-liệu</span>
            <span className="mb-1 mt-3 font-bold uppercase tracking-wider">Kênh thoại</span>
            <span className="flex items-center gap-1 px-2 py-1 text-emerald-300"><Volume2 size={12} /> Phòng học nhóm</span>
            {avatars.slice(4, 7).map((a, i) => (
              <span key={a} className="ml-4 flex items-center gap-1.5">
                <img src={a} alt="" className={`h-4 w-4 rounded-full ${i === 0 ? 'ring-2 ring-brand-400' : ''}`} />
                {['Lan Chi', 'Gia Huy', 'Thu Hà'][i]}
              </span>
            ))}
          </div>
          <div className="flex flex-1 flex-col justify-end gap-3 bg-ink-800 p-4 text-[12px]">
            {[
              { a: avatars[0], n: 'Minh Anh', t: 'Tuần này chốt kiến trúc cho đồ án nhé 👋' },
              { a: avatars[2], n: 'Thu Hà', t: 'Modular Monolith + Pub-Sub là hợp lý nhất!' },
              { a: avatars[3], n: 'Gia Huy', t: 'Mình đẩy bản demo chat realtime lên rồi 🚀' },
            ].map((m) => (
              <div key={m.n} className="flex gap-2">
                <img src={m.a} alt="" className="h-7 w-7 rounded-full" />
                <div>
                  <b className="text-white">{m.n}</b>
                  <p className="text-slate-300">{m.t}</p>
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-brand-400/30 bg-gradient-to-r from-brand-400/10 to-aurora-400/10 p-2.5 text-slate-200">
              <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-brand-200">
                <Sparkles size={11} /> Tóm tắt AI
              </span>
              Nhóm thống nhất kiến trúc, phân công 4 phần việc, hạn nộp thứ Sáu.
            </div>
            <div className="rounded-xl bg-ink-700 px-3 py-2 text-slate-500">Nhắn tin tới #thảo-luận</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    img: art.planet,
    eyebrow: 'Server & Kênh',
    title: 'Server và kênh của riêng nhóm bạn',
    text: 'Đăng ký trong vài giây, tạo server cho lớp học hay CLB, mời bạn bè bằng mã mời. Quản trị viên sắp xếp kênh văn bản và kênh thoại theo ý muốn.',
    bullets: [
      { icon: ShieldCheck, label: 'Đăng ký / Đăng nhập an toàn' },
      { icon: Users, label: 'Tạo hoặc tham gia server' },
      { icon: Hash, label: 'Admin tạo kênh Text / Voice' },
    ],
  },
  {
    img: art.speechBalloon,
    eyebrow: 'Nhắn tin',
    title: 'Trò chuyện thời gian thực, gửi file trong tích tắc',
    text: 'Tin nhắn xuất hiện ngay lập tức với mọi người trong kênh. Kéo thả hình ảnh, tài liệu và cuộn lên để xem lại toàn bộ lịch sử trò chuyện.',
    bullets: [
      { icon: Radio, label: 'Gửi / nhận tin nhắn realtime' },
      { icon: History, label: 'Lịch sử & tìm kiếm tin nhắn' },
      { icon: FileUp, label: 'Tải lên file / hình ảnh' },
    ],
  },
  {
    img: art.microphone,
    eyebrow: 'Gọi thoại',
    title: 'Vào phòng thoại chỉ với một cú nhấp',
    text: 'Không cần gọi hay chờ ai bắt máy. Nhấn vào kênh thoại là trò chuyện ngay qua WebRTC, viền sáng cho biết ai đang nói.',
    bullets: [
      { icon: Volume2, label: 'Tham gia / rời kênh thoại' },
      { icon: Mic, label: 'Bật / tắt micro, tắt loa' },
    ],
  },
  {
    img: art.brain,
    eyebrow: 'Trợ lý AI',
    title: 'Bận quá? Để AI tóm tắt giúp bạn',
    text: 'Bỏ lỡ hàng trăm tin nhắn? Một cú nhấp để AI Service rút ra ý chính, việc cần làm và những câu hỏi chưa ai trả lời.',
    bullets: [{ icon: Sparkles, label: 'Tóm tắt 20 / 50 / 100 tin gần nhất' }],
  },
];

const architecture = [
  {
    icon: Layers,
    title: 'Layered Architecture',
    text: 'Mỗi module chia 4 tầng: Presentation → Application → Domain, còn Infrastructure hiện thực các port (Mock hoặc HTTP).',
  },
  {
    icon: Boxes,
    title: 'Modular Monolith',
    text: 'Một ứng dụng, 5 module độc lập: auth · server · chat · voice · ai. Mỗi module chỉ lộ ra một public API (index.ts).',
  },
  {
    icon: Radio,
    title: 'Pub-Sub',
    text: 'Module giao tiếp qua Event Bus có kiểu. Sự kiện realtime từ Socket.IO / BroadcastChannel cũng đổ vào cùng bus.',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink-950 text-slate-100">
      {/* HERO */}
      <section className="relative">
        <div className="starfield pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -left-40 top-20 h-[520px] w-[520px] rounded-full bg-brand-500/25 blur-[140px]" />
        <div className="pointer-events-none absolute right-0 top-0 h-[480px] w-[480px] rounded-full bg-aurora-500/30 blur-[140px]" />

        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link to="/" className="text-white">
            <Logo size={34} />
          </Link>
          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-300 md:flex">
            <a href="#tinh-nang" className="hover:text-white">Tính năng</a>
            <a href="#kien-truc" className="hover:text-white">Kiến trúc</a>
            <Link to="/register" className="hover:text-white">Đăng ký</Link>
          </div>
          <Link to="/login" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink-950 hover:bg-brand-50">
            Đăng nhập
          </Link>
        </nav>

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 pb-28 pt-10 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-brand-200">
              <Sparkles size={14} /> Chat · Voice · AI trong một nơi
            </span>
            <h1 className="mt-6 font-display text-[40px] font-extrabold leading-[1.1] tracking-tight sm:text-5xl xl:text-[58px]">
              Tụ họp, trò chuyện
              <br />
              và <span className="text-gradient">làm việc nhóm</span>
              <br />
              không giới hạn.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">
              Nebula là nơi lớp học, câu lạc bộ và hội bạn thân cùng nhắn tin realtime, gọi thoại một chạm và để AI tóm tắt những gì bạn
              đã bỏ lỡ.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Cta />
              <Link to="/register" className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 font-semibold hover:bg-white/5">
                Tạo tài khoản miễn phí
              </Link>
            </div>
          </div>
          <AppPreview />
        </div>
      </section>

      {/* FEATURES */}
      <section id="tinh-nang" className="relative bg-gradient-to-b from-ink-950 via-[#0E1530] to-ink-950 py-20">
        <div className="mx-auto max-w-6xl space-y-10 px-5 sm:px-8">
          {features.map((f, i) => (
            <article
              key={f.title}
              className="grid items-center gap-10 rounded-[36px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur sm:p-12 md:grid-cols-2"
            >
              <div className={`relative flex justify-center ${i % 2 ? 'md:order-2' : ''}`}>
                <div className="absolute inset-6 rounded-full bg-gradient-to-br from-brand-500/30 to-aurora-500/30 blur-3xl" />
                <img src={f.img} alt="" className="relative w-44 animate-float drop-shadow-2xl sm:w-56" style={{ animationDelay: `${i * 0.6}s` }} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-300">{f.eyebrow}</span>
                <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">{f.title}</h2>
                <p className="mt-4 text-lg leading-relaxed text-slate-300">{f.text}</p>
                <ul className="mt-6 space-y-2.5">
                  {f.bullets.map((b) => (
                    <li key={b.label} className="flex items-center gap-3 text-slate-200">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-400/15 text-brand-300">
                        <b.icon size={17} />
                      </span>
                      {b.label}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section id="kien-truc" className="relative py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-aurora-300">Kiến trúc frontend</span>
            <h2 className="mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl">Ba mẫu kiến trúc, một hệ thống gọn gàng</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {architecture.map((a) => (
              <div key={a.title} className="rounded-3xl border border-white/10 bg-gradient-to-br from-ink-800 to-ink-900 p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-aurora-500 text-ink-950">
                  <a.icon size={22} />
                </span>
                <h3 className="mt-5 font-display text-xl font-bold text-white">{a.title}</h3>
                <p className="mt-2 leading-relaxed text-slate-400">{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-24 text-center">
        <div className="starfield pointer-events-none absolute inset-0 opacity-70" />
        <img src={art.comet} alt="" className="absolute left-[8%] top-10 hidden w-24 animate-float md:block" />
        <img src={art.sparkles} alt="" className="absolute bottom-10 right-[10%] hidden w-20 animate-float [animation-delay:1s] md:block" />
        <h2 className="relative mx-auto max-w-3xl font-display text-4xl font-extrabold uppercase leading-tight text-white sm:text-5xl">
          Sẵn sàng bắt đầu cuộc trò chuyện?
        </h2>
        <div className="relative mt-8 flex justify-center">
          <Cta />
        </div>
      </section>

      <footer className="border-t border-white/5 px-5 py-8 text-center text-sm text-muted">
        <Logo size={24} className="text-white" />
        <p className="mt-3">
          Icon 3D: Microsoft Fluent Emoji (MIT) · Avatar: DiceBear (CC0) · Icon giao diện: Lucide (ISC)
        </p>
      </footer>
    </div>
  );
}
