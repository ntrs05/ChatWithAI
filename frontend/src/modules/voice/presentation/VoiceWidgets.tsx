import { useEffect, useRef } from 'react';
import { HeadphoneOff, Headphones, Mic, MicOff, PhoneOff, Signal } from 'lucide-react';
import { cn } from '@/shared/lib';
import { Avatar, IconButton } from '@/shared/ui';
import { useVoiceStore } from '../application/voiceStore';
import { voiceService } from '../module';

/** Danh sách người đang ở trong kênh thoại (hiển thị dưới tên kênh ở sidebar). */
export function VoiceChannelParticipants({ channelId }: { channelId: string }) {
  const participants = useVoiceStore((s) => s.participants[channelId]);
  const speaking = useVoiceStore((s) => s.speaking);
  if (!participants?.length) return null;
  return (
    <ul className="mb-1 ml-7 space-y-0.5">
      {participants.map((p) => (
        <li key={p.clientId} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-slate-300">
          <Avatar src={p.user.avatarUrl} name={p.user.displayName} size={22} speaking={speaking[p.clientId]} />
          <span className="flex-1 truncate">{p.user.displayName}</span>
          {p.deafened ? (
            <HeadphoneOff size={13} className="text-rose-400" />
          ) : p.muted ? (
            <MicOff size={13} className="text-rose-400" />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Nút micro / loa — gắn vào UserPanel của module Auth qua slot `actions`. */
export function VoiceControls() {
  const muted = useVoiceStore((s) => s.muted);
  const deafened = useVoiceStore((s) => s.deafened);
  return (
    <>
      <IconButton label={muted ? 'Bật micro' : 'Tắt micro'} danger={muted} onClick={() => voiceService().toggleMute()}>
        {muted ? <MicOff size={17} /> : <Mic size={17} />}
      </IconButton>
      <IconButton label={deafened ? 'Bật loa' : 'Tắt loa'} danger={deafened} onClick={() => voiceService().toggleDeafen()}>
        {deafened ? <HeadphoneOff size={17} /> : <Headphones size={17} />}
      </IconButton>
    </>
  );
}

/** Thanh trạng thái "Đã kết nối thoại" phía trên UserPanel. */
export function VoiceStatusPanel({ serverName, onOpen }: { serverName?: string; onOpen?: () => void }) {
  const status = useVoiceStore((s) => s.status);
  const channel = useVoiceStore((s) => s.channel);
  if (status === 'idle' || !channel) return null;
  return (
    <div className="flex items-center gap-2 border-t border-white/5 bg-ink-900/80 px-3 py-2">
      <Signal size={18} className={status === 'connected' ? 'text-emerald-400' : 'animate-pulse text-amber-300'} />
      <button onClick={onOpen} className="min-w-0 flex-1 text-left leading-tight">
        <span className={cn('block text-sm font-semibold', status === 'connected' ? 'text-emerald-400' : 'text-amber-300')}>
          {status === 'connected' ? 'Đã kết nối thoại' : 'Đang kết nối…'}
        </span>
        <span className="block truncate text-xs text-muted hover:underline">
          {channel.name}
          {serverName ? ` / ${serverName}` : ''}
        </span>
      </button>
      <IconButton label="Rời kênh thoại" danger onClick={() => void voiceService().leave()}>
        <PhoneOff size={17} />
      </IconButton>
    </div>
  );
}

/** Phát âm thanh của các peer (thẻ <audio> ẩn). */
export function VoiceAudioSink() {
  const streams = useVoiceStore((s) => s.remoteStreams);
  const deafened = useVoiceStore((s) => s.deafened);
  return (
    <div hidden>
      {Object.entries(streams).map(([id, stream]) => (
        <RemoteAudio key={id} stream={stream} muted={deafened} />
      ))}
    </div>
  );
}

function RemoteAudio({ stream, muted }: { stream: MediaStream; muted: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
      void ref.current.play().catch(() => {});
    }
  }, [stream]);
  return <audio ref={ref} autoPlay muted={muted} />;
}
