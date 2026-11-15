import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, MailPlus, X } from 'lucide-react';
import { toast } from '@/shared/event-bus';
import { errorMessage } from '@/shared/http';
import { Avatar, Button, IconButton } from '@/shared/ui';
import { useServerStore } from '../application/serverStore';
import type { Invitation } from '../domain/models';
import { serverService } from '../module';

/** Lời mời vào server do bạn bè / thành viên gửi: bấm Tham gia hoặc Từ chối. */
export function InvitationsPanel() {
  const navigate = useNavigate();
  const invitations = useServerStore((s) => s.invitations);
  const [busy, setBusy] = useState<string | null>(null);

  if (invitations.length === 0) return null;

  const respond = async (inv: Invitation, accept: boolean) => {
    setBusy(inv.id);
    try {
      await serverService().respondInvitation(inv, accept);
      if (accept) navigate(`/app/${inv.serverId}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Không trả lời được lời mời'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-brand-400/30 bg-brand-400/5 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-200">
        <MailPlus size={16} /> Lời mời vào server — {invitations.length}
      </h2>
      <ul className="space-y-2">
        {invitations.map((inv) => (
          <li key={inv.id} className="flex items-center gap-3 rounded-xl bg-ink-750 p-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink-600">
              <img src={inv.iconUrl} alt="" className="h-8 w-8 object-contain" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-white">{inv.serverName}</span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Avatar src={inv.invitedBy.avatarUrl} name={inv.invitedBy.displayName} size={16} />
                <span className="truncate">
                  {inv.invitedBy.displayName} mời bạn · {inv.memberCount} thành viên
                </span>
              </span>
            </span>
            <Button size="sm" loading={busy === inv.id} icon={<Check size={16} />} onClick={() => void respond(inv, true)}>
              Tham gia
            </Button>
            <IconButton label="Từ chối" danger disabled={busy === inv.id} onClick={() => void respond(inv, false)}>
              <X size={17} />
            </IconButton>
          </li>
        ))}
      </ul>
    </section>
  );
}
