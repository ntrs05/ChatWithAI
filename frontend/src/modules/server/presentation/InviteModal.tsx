import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { art } from '@/shared/assets';
import { Button, Modal } from '@/shared/ui';
import type { Server } from '../domain/models';

export function InviteModal({ server, open, onClose }: { server: Server; open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(server.inviteCode);
    } catch {
      /* trình duyệt chặn clipboard — người dùng vẫn đọc được mã */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal open={open} onClose={onClose} title={`Mời bạn bè vào ${server.name}`}>
      <div className="flex items-center gap-4">
        <img src={art.megaphone} alt="" className="h-20 w-20" />
        <p className="text-sm text-slate-300">
          Gửi mã mời này cho bạn bè. Họ chọn <b>“+” → Dùng mã mời</b> ở thanh bên trái để tham gia.
        </p>
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-xl border border-ink-600 bg-ink-950/70 p-1.5 pl-4">
        <span className="flex-1 font-mono text-lg font-bold tracking-[0.3em] text-brand-200">{server.inviteCode}</span>
        <Button size="sm" onClick={copy} icon={copied ? <Check size={16} /> : <Copy size={16} />}>
          {copied ? 'Đã chép' : 'Sao chép'}
        </Button>
      </div>
    </Modal>
  );
}
