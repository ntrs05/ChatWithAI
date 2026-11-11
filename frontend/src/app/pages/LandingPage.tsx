import { Link } from 'react-router-dom';
import { Logo } from '@/shared/ui';

// Trang giới thiệu. TODO: làm giao diện thật, giờ chỉ để có chỗ bấm vào app.
export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-900 text-white">
      <Logo />
      <p className="text-zinc-400">Đang dựng — các module sẽ được làm dần.</p>
      <div className="flex gap-3">
        <Link className="rounded bg-indigo-600 px-4 py-2" to="/login">Đăng nhập</Link>
        <Link className="rounded bg-zinc-700 px-4 py-2" to="/app">Vào ứng dụng</Link>
      </div>
    </div>
  );
}
