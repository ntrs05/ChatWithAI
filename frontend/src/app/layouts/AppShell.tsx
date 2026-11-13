import { NavLink, Outlet } from 'react-router-dom';
import { Logo } from '@/shared/ui';

const NAV = [
  ['/app', 'Trang chủ'],
  ['/app/friends', 'Bạn bè'],
  ['/app/notifications', 'Thông báo'],
  ['/app/discover', 'Khám phá server'],
  ['/app/dm/demo', 'Tin nhắn 1-1'],
  ['/app/demo-server', 'Một server'],
  ['/app/settings', 'Cài đặt'],
  ['/app/admin', 'Quản trị'],
] as const;

// menu tạm, sau thay bằng ServerRail, DirectList, UserPanel
export function AppShell() {
  return (
    <div className="flex h-screen bg-zinc-900 text-white">
      <div className="w-48 shrink-0 border-r border-zinc-800 bg-zinc-950"><Slot name="ServerRail" from="server" /></div>
      <aside className="flex w-60 flex-col gap-1 border-r border-zinc-800 p-3">
        <Logo />
        {NAV.map(([to, label]) => (
          <NavLink key={to} to={to} end className={({ isActive }) => `rounded px-2 py-1 ${isActive ? 'bg-zinc-700' : 'text-zinc-400 hover:bg-zinc-800'}`}>
            {label}
          </NavLink>
        ))}
        <Slot name="DirectList" from="direct" />
        <div className="mt-auto"><Slot name="UserPanel" from="auth" /></div>
      </aside>
      <main className="flex flex-1 flex-col overflow-auto"><Outlet /></main>
    </div>
  );
}

// placeholder, thay bằng component thật khi module xong
function Slot({ name, from, grow = false }: { name: string; from: string; grow?: boolean }) {
  return (
    <div className={`flex min-h-[110px] items-center justify-center p-3 ${grow ? 'flex-1' : ''}`}>
      <div className="rounded-xl border border-dashed border-zinc-600 px-5 py-4 text-center text-zinc-400">
        <p className="font-semibold text-zinc-100">{name}</p>
        <p className="mt-1 text-xs">module {from} · chưa ghép</p>
      </div>
    </div>
  );
}
