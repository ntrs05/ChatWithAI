import { useCallback, useEffect, useRef, useState } from 'react';
import { Headphones, Mic, Square, Volume2 } from 'lucide-react';
import { cn } from '@/shared/lib';
import { Button } from '@/shared/ui';
import type { AudioDeviceInfo, MicTestSession, PlaybackHandle } from '../application/ports';
import { useVoiceSettings } from '../application/voiceSettings';
import { useVoiceStore } from '../application/voiceStore';
import { audioDevices } from '../module';

/** Ghi tối đa bấy nhiêu giây rồi tự dừng và phát lại. */
const MAX_RECORD_S = 8;
const BARS = 40;

type TestState = 'idle' | 'recording' | 'playing';

function Select({
  label,
  icon,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: AudioDeviceInfo[];
  placeholder: string;
  disabled?: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <label className="block min-w-0 flex-1 text-sm">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
      <span className="flex h-11 items-center gap-2 rounded-xl border border-ink-600 bg-ink-900/60 px-3 focus-within:border-brand-400/60">
        <span className="text-muted">{icon}</span>
        <select
          aria-label={label}
          disabled={disabled}
          value={options.some((o) => o.id === value) ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 truncate bg-transparent text-sm font-medium text-white outline-none disabled:opacity-60"
        >
          <option value="" className="bg-ink-800">
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id} className="bg-ink-800">
              {o.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

/** Cài đặt → Giọng nói & Video: chọn micro / loa, âm lượng loa, kiểm tra micro (ghi rồi nghe lại) và kiểm tra loa. */
export function VoiceSettingsPanel() {
  const { micId, speakerId, speakerVolume, setMic, setSpeaker, setSpeakerVolume } = useVoiceSettings();
  const inCall = useVoiceStore((s) => s.status !== 'idle');
  const devices = audioDevices();

  const [mics, setMics] = useState<AudioDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<AudioDeviceInfo[]>([]);
  const [denied, setDenied] = useState(false);
  const [state, setState] = useState<TestState>('idle');
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [toneBusy, setToneBusy] = useState(false);

  const barsRef = useRef<HTMLDivElement>(null);
  const session = useRef<MicTestSession | null>(null);
  const playback = useRef<PlaybackHandle | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    const l = await devices.list();
    if (!alive.current) return;
    setMics(l.mics);
    setSpeakers(l.speakers);
    // Chưa cấp quyền thì trình duyệt không cho biết tên thiết bị
    setDenied(l.mics.length === 0 || l.mics.every((m) => /^Micro \d+$/.test(m.label)));
  }, [devices]);

  useEffect(() => {
    alive.current = true;
    void refresh();
    navigator.mediaDevices?.addEventListener?.('devicechange', refresh);
    return () => {
      alive.current = false;
      navigator.mediaDevices?.removeEventListener?.('devicechange', refresh);
      if (timer.current) clearInterval(timer.current);
      playback.current?.stop();
      void session.current?.stop();
    };
  }, [refresh]);

  /** Vẽ thanh mức âm trực tiếp lên DOM (không setState mỗi khung hình). */
  const paintLevel = useCallback((level: number) => {
    const root = barsRef.current;
    if (!root) return;
    const lit = Math.round(level * BARS);
    Array.from(root.children).forEach((el, i) => el.classList.toggle('is-lit', i < lit));
  }, []);

  async function allowMic() {
    setError('');
    const ok = await devices.requestPermission();
    if (!ok) setError('Trình duyệt đang chặn micro. Bấm biểu tượng ổ khóa cạnh địa chỉ web → cho phép Micro rồi thử lại.');
    await refresh();
  }

  async function stopRecording() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    const s = session.current;
    session.current = null;
    const blob = await s?.stop();
    if (!alive.current) return;
    if (!blob) {
      setState('idle');
      setError('Không thu được âm thanh nào. Hãy kiểm tra micro đã chọn.');
      return;
    }
    setState('playing');
    try {
      const h = await devices.play(blob, speakerId, speakerVolume);
      playback.current = h;
      await h.ended;
    } catch {
      setError('Không phát lại được bản ghi.');
    }
    playback.current = null;
    if (alive.current) setState('idle');
  }

  async function start() {
    setError('');
    try {
      const s = await devices.startMicTest(micId, paintLevel);
      session.current = s;
      setSeconds(0);
      setState('recording');
      void refresh(); // có quyền rồi → lấy được tên thiết bị
      let n = 0;
      timer.current = setInterval(() => {
        n += 1;
        setSeconds(n);
        if (n >= MAX_RECORD_S) void stopRecording();
      }, 1000);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'Trình duyệt đang chặn micro. Bấm biểu tượng ổ khóa cạnh địa chỉ web → cho phép Micro rồi thử lại.'
          : name === 'NotFoundError'
            ? 'Không tìm thấy micro nào trên máy.'
            : 'Không mở được micro để kiểm tra.',
      );
      setState('idle');
    }
  }

  function stopPlayback() {
    playback.current?.stop();
  }

  async function testSpeaker() {
    setToneBusy(true);
    try {
      await devices.playTone(speakerId, speakerVolume);
    } finally {
      if (alive.current) setToneBusy(false);
    }
  }

  const canRecord = devices.supportsRecording();

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/5 bg-ink-750 p-5">
        <h2 className="mb-4 font-display text-lg font-bold text-white">Giọng nói</h2>

        {denied && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            <span>Cho phép dùng micro để thấy tên các thiết bị.</span>
            <Button size="sm" variant="secondary" onClick={() => void allowMic()}>
              Cho phép micro
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row">
          <Select label="Micro" icon={<Mic size={16} />} value={micId} options={mics} placeholder="Mặc định của hệ thống" onChange={setMic} />
          <Select
            label="Loa / tai nghe"
            icon={<Headphones size={16} />}
            value={speakerId}
            options={speakers}
            placeholder="Mặc định của hệ thống"
            disabled={!devices.supportsSpeakerSelect()}
            onChange={setSpeaker}
          />
        </div>
        {!devices.supportsSpeakerSelect() && (
          <p className="mt-2 text-xs text-muted">Trình duyệt này (vd Firefox, Safari) không cho chọn loa riêng — âm thanh phát ra thiết bị mặc định.</p>
        )}
        {inCall && <p className="mt-2 text-xs text-muted">Bạn đang trong kênh thoại: đổi micro sẽ có hiệu lực khi vào lại kênh.</p>}

        <div className="mt-5 max-w-sm">
          <label className="block text-sm">
            <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-muted">
              Âm lượng loa <span className="text-slate-300">{speakerVolume}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={speakerVolume}
              aria-label="Âm lượng loa"
              onChange={(e) => setSpeakerVolume(Number(e.target.value))}
              className="w-full accent-brand-400"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-white/5 bg-ink-750 p-5">
        <h2 className="font-display text-lg font-bold text-white">Kiểm tra micro</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted">
          Bấm <b className="text-slate-200">Kiểm tra mic</b>, nói vài câu rồi bấm Dừng (tự dừng sau {MAX_RECORD_S} giây). Nebula sẽ <b className="text-slate-200">phát lại giọng bạn</b> để bạn nghe đúng
          như người khác nghe. Nên đeo tai nghe để tránh vang.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          {state === 'idle' && (
            <Button icon={<Mic size={17} />} onClick={() => void start()} disabled={!canRecord}>
              Kiểm tra mic
            </Button>
          )}
          {state === 'recording' && (
            <Button variant="danger" icon={<Square size={15} />} onClick={() => void stopRecording()}>
              Dừng · {seconds}s
            </Button>
          )}
          {state === 'playing' && (
            <Button variant="secondary" icon={<Square size={15} />} onClick={stopPlayback}>
              Dừng phát
            </Button>
          )}

          <div
            ref={barsRef}
            aria-hidden
            className={cn(
              'flex h-9 min-w-0 flex-1 items-center gap-[3px]',
              '[&>i]:h-full [&>i]:w-[5px] [&>i]:shrink-0 [&>i]:rounded-full [&>i]:bg-ink-600 [&>i]:transition-colors',
              '[&>i.is-lit]:bg-emerald-400',
            )}
          >
            {Array.from({ length: BARS }, (_, i) => (
              <i key={i} />
            ))}
          </div>
        </div>

        <p className="mt-3 min-h-5 text-sm" aria-live="polite">
          {state === 'recording' && <span className="text-rose-300">● Đang ghi… hãy nói gì đó</span>}
          {state === 'playing' && <span className="text-emerald-300">▶ Đang phát lại giọng của bạn…</span>}
          {state === 'idle' && !error && !canRecord && <span className="text-rose-300">Trình duyệt không hỗ trợ ghi âm để kiểm tra.</span>}
          {error && <span className="text-rose-300">{error}</span>}
        </p>
        <p className="mt-1 text-xs text-muted">Thanh xanh nhảy nhưng nghe lại không thấy gì → micro đang thu nhưng loa/tai nghe chọn ở trên có thể sai thiết bị.</p>
      </section>

      <section className="rounded-2xl border border-white/5 bg-ink-750 p-5">
        <h2 className="font-display text-lg font-bold text-white">Kiểm tra loa</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted">Phát một đoạn nhạc ngắn ra loa / tai nghe đang chọn.</p>
        <Button variant="secondary" icon={<Volume2 size={17} />} loading={toneBusy} onClick={() => void testSpeaker()}>
          Phát âm thử
        </Button>
      </section>
    </div>
  );
}
