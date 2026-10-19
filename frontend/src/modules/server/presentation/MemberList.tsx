import { Crown } from 'lucide-react';
import { Avatar } from '@/shared/ui';
import { useServerStore } from '../application/serverStore';
import type { Member } from '../domain/models';

export function MemberList({ serverId }: { serverId: string }) {
  const members = useServerStore((s) => s.members[serverId]);
  const meId = useServerStore((s) => s.meId);
  const ownerId = useServerStore((s) => s.servers.find((x) => x.id === serverId)?.ownerId);

  if (!members) return null;
  const groups: Array<{ title: string; items: Member[] }> = [
    { title: 'Quản trị viên', items: members.filter((m) => m.role === 'admin') },
    { title: 'Thành viên', items: members.filter((m) => m.role === 'member') },
  ];

  return (
    <div className="h-full overflow-y-auto px-3 py-4">
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <section key={g.title} className="mb-5">
              <h3 className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                {g.title} — {g.items.length}
              </h3>
              <ul className="space-y-0.5">
                {g.items.map((m) => (
                  <li key={m.user.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/5">
                    <Avatar src={m.user.avatarUrl} name={m.user.displayName} size={32} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                      {m.user.displayName}
                      {m.user.id === meId && <span className="ml-1 text-xs text-muted">(bạn)</span>}
                    </span>
                    {m.user.id === ownerId && (
                      <span title="Chủ server">
                        <Crown size={14} className="text-amber-300" />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ),
      )}
    </div>
  );
}
