import type { ReactNode } from 'react';
import { AlertTriangle, HeadphoneOff, Headphones, Menu, Mic, MicOff, PhoneCall, PhoneOff, Volume2 } from 'lucide-react';
import { art } from '@/shared/assets';
import { cn } from '@/shared/lib';
import { Avatar, Button, IconButton, Spinner } from '@/shared/ui';
import { useVoiceStore } from '../application/voiceStore';
import type { VoiceChannelRef } from '../domain/models';
import { voiceService } from '../module';

/** Màn hình phòng thoại (UC07 + UC08). */
export function VoiceRoomView({ channel, onOpenSidebar }: { channel: VoiceChannelRef; onOpenSidebar?: () => void }) {
  const status = useVoiceStore((s) => s.status);
  const current = useVoiceStore((s) => s.channel);
  const participants = useVoiceStore((s) => s.participants[channel.id]) ?? [];
  const speaking = useVoiceStore((s) => s.speaking);
  const myClientId = useVoiceStore((s) => s.clientId);
  const muted = useVoiceStore((s) => s.muted);
  const deafened = useVoiceStore((s) => s.deafened);
  const micError = useVoiceStore((s) => s.micError);

  const inThisRoom = current?.id === channel.id && status !== 'idle';
  const svc = voiceService();

  return (
    <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-ink-950">
      <div className="starfield pointer-events-none absolute inset-0 opacity-40" />
      <header className="relative flex h-14 shrink-0 items-center gap-2 border-b border-white/5 px-3">
        {onOpenSidebar && (
          <IconButton label="Mở danh sách kênh" onClick={onOpenSidebar} className="md:hidden">
            <Menu size={20} />
          </IconButton>
        )}
        <Volume2 size={22} className="text-muted" />
        <h1 className="font-semibold text-white">{channel.name}</h1>
        <span className="ml-2 rounded-md bg-white/5 px-2 py-0.5 text-xs text-muted">{participants.length} người</span>
      </header>

      {micError && inThisRoom && (
        <div className="relative mx-4 mt-4 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-100">
          <AlertTriangle size={16} className="shrink-0" /> {micError}
        </div>
      )}

      <div className="relative flex flex-1 items-center justify-center overflow-y-auto p-6">
        {!inThisRoom ? (
          <div className="text-center">
            <img src={art.headphone} alt="" className="mx-auto h-28 w-28 animate-float" />
            <h2 className="mt-4 font-display text-2xl font-bold text-white">{channel.name}</h2>
            <p className="mt-1 text-muted">
              {participants.length ? `${participants.length} người đang trò chuyện` : 'Chưa có ai trong kênh. Hãy là người đầu tiên!'}
            </p>
            <Button size="lg" className="mt-6" icon={<PhoneCall size={18} />} onClick={() => void svc.join(channel)}>
              Tham gia kênh thoại
            </Button>
          </div>
        ) : status === 'connecting' ? (
          <div className="flex flex-col items-center gap-3 text-muted">
            <Spinner size={30} className="text-brand-400" />
            Đang kết nối tới kênh thoại…
          </div>
        ) : (
          <div className="grid w-full max-w-4xl grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            {participants.map((p) => {
              const talking = speaking[p.clientId] && !p.muted;
              return (
                <div
                  key={p.clientId}
                  className={cn(
                    'relative flex aspect-video flex-col items-center justify-center rounded-2xl border bg-gradient-to-br from-ink-700 to-ink-800 transition',
                    talking ? 'border-brand-400 shadow-glow' : 'border-white/5',
                  )}
                >
                  <Avatar src={p.user.avatarUrl} name={p.user.displayName} size={72} className={talking ? 'animate-pulsering' : ''} />
                  <span className="absolute bottom-2 left-2 inline-flex max-w-[80%] items-center gap-1.5 rounded-lg bg-ink-950/80 px-2 py-1 text-xs font-semibold text-white">
                    <span className="truncate">{p.user.displayName}</span>
                    {p.clientId === myClientId && <span className="text-muted">(bạn)</span>}
                  </span>
                  {(p.muted || p.deafened) && (
                    <span className="absolute bottom-2 right-2 rounded-full bg-rose-500/90 p-1.5 text-white">
                      {p.deafened ? <HeadphoneOff size={13} /> : <MicOff size={13} />}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {inThisRoom && (
        <footer className="relative flex justify-center gap-3 pb-6">
          <ControlButton label={muted ? 'Bật micro' : 'Tắt micro'} danger={muted} onClick={() => svc.toggleMute()}>
            {muted ? <MicOff size={22} /> : <Mic size={22} />}
          </ControlButton>
          <ControlButton label={deafened ? 'Bật loa' : 'Tắt loa'} danger={deafened} onClick={() => svc.toggleDeafen()}>
            {deafened ? <HeadphoneOff size={22} /> : <Headphones size={22} />}
          </ControlButton>
          <ControlButton label="Rời kênh" leave onClick={() => void svc.leave()}>
            <PhoneOff size={22} />
          </ControlButton>
        </footer>
      )}
    </section>
  );
}

function ControlButton({
  label,
  danger,
  leave,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  leave?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-14 w-14 items-center justify-center rounded-full transition hover:scale-105',
        leave ? 'bg-rose-500 text-white hover:bg-rose-400' : danger ? 'bg-white text-rose-500' : 'bg-ink-600 text-white hover:bg-ink-500',
      )}
    >
      {children}
    </button>
  );
}
