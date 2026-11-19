import { useState } from 'react';
import { ScrollText, Server, ShieldCheck, Users } from 'lucide-react';
import { cn } from '@/shared/lib';
import { AuditTab } from './AuditTab';
import { ServersTab } from './ServersTab';
import { UsersTab } from './UsersTab';

const TABS = [
  { id: 'users', label: 'Người dùng', icon: Users },
  { id: 'servers', label: 'Server', icon: Server },
  { id: 'audit', label: 'Nhật ký', icon: ScrollText },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** Trang quản trị hệ thống. Chỉ hiển thị cho admin (ở lớp ghép), và backend vẫn kiểm tra quyền ở từng API. */
export function AdminPage() {
  const [tab, setTab] = useState<TabId>('users');
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 border-b border-black/20 px-4 py-3 pl-14 md:pl-6">
        <ShieldCheck size={22} className="text-brand-300" />
        <h1 className="text-lg font-bold text-white">Quản trị hệ thống</h1>
        <nav className="ml-auto flex gap-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition',
                tab === t.id ? 'bg-brand-400/15 text-white' : 'text-muted hover:bg-white/5 hover:text-white',
              )}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </nav>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {tab === 'users' && <UsersTab />}
        {tab === 'servers' && <ServersTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}
