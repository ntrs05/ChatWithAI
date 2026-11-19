import type { AudioDevicesPort, AudioDeviceInfo, MicTestSession, PlaybackHandle } from '../application/ports';

type SinkAudio = HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((m) => MediaRecorder.isTypeSupported(m));
}

async function openMic(micId: string): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Trình duyệt không hỗ trợ micro');
  const base = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: micId ? { ...base, deviceId: { exact: micId } } : base, video: false });
  } catch (err) {
    // Thiết bị đã chọn không còn (rút tai nghe) → dùng thiết bị mặc định
    if (micId && err instanceof DOMException && (err.name === 'OverconstrainedError' || err.name === 'NotFoundError')) {
      return navigator.mediaDevices.getUserMedia({ audio: base, video: false });
    }
    throw err;
  }
}

async function route(audio: SinkAudio, speakerId: string, volume: number) {
  audio.volume = Math.min(1, Math.max(0, volume / 100));
  if (speakerId && audio.setSinkId) {
    try {
      await audio.setSinkId(speakerId);
    } catch {
      /* thiết bị không còn: phát ra loa mặc định */
    }
  }
}

export class BrowserAudioDevices implements AudioDevicesPort {
  supportsSpeakerSelect(): boolean {
    return typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;
  }

  supportsRecording(): boolean {
    return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }

  async requestPermission(): Promise<boolean> {
    try {
      const s = await openMic('');
      s.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<{ mics: AudioDeviceInfo[]; speakers: AudioDeviceInfo[] }> {
    if (!navigator.mediaDevices?.enumerateDevices) return { mics: [], speakers: [] };
    const all = await navigator.mediaDevices.enumerateDevices();
    const map = (kind: MediaDeviceKind, fallback: string) =>
      all
        .filter((d) => d.kind === kind && d.deviceId)
        .map((d, i) => ({ id: d.deviceId, label: d.label || `${fallback} ${i + 1}` }));
    return { mics: map('audioinput', 'Micro'), speakers: map('audiooutput', 'Loa') };
  }

  /** Mở micro đã chọn, đo mức âm (0–1) liên tục và GHI ÂM để phát lại. */
  async startMicTest(micId: string, onLevel: (level: number) => void): Promise<MicTestSession> {
    const stream = await openMic(micId);
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    let raf = 0;
    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      onLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
      raf = requestAnimationFrame(tick);
    };
    tick();

    const mime = pickMime();
    const chunks: Blob[] = [];
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    rec.start();

    let finished: Promise<Blob | null> | null = null;
    const release = () => {
      cancelAnimationFrame(raf);
      onLevel(0);
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close().catch(() => {});
    };
    return {
      stop() {
        finished ??= new Promise<Blob | null>((resolve) => {
          const done = () => {
            release();
            resolve(chunks.length ? new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }) : null);
          };
          if (rec.state === 'inactive') return done();
          rec.onstop = done;
          rec.stop();
        });
        return finished;
      },
    };
  }

  async play(blob: Blob, speakerId: string, volume: number): Promise<PlaybackHandle> {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url) as SinkAudio;
    await route(audio, speakerId, volume);
    let settle: () => void = () => {};
    const ended = new Promise<void>((r) => (settle = r));
    const cleanup = () => {
      URL.revokeObjectURL(url);
      settle();
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;
    await audio.play().catch(cleanup);
    return {
      ended,
      stop() {
        audio.pause();
        cleanup();
      },
    };
  }

  /** Bíp ngắn để thử loa. */
  async playTone(speakerId: string, volume: number): Promise<void> {
    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      o.connect(gain);
      o.start(ctx.currentTime + i * 0.28);
      o.stop(ctx.currentTime + i * 0.28 + 0.26);
    });
    gain.connect(dest);
    const audio = new Audio() as SinkAudio;
    audio.srcObject = dest.stream;
    await route(audio, speakerId, volume);
    await audio.play().catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));
    audio.pause();
    audio.srcObject = null;
    void ctx.close().catch(() => {});
  }
}
