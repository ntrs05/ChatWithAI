import type { AudioLevelMeter, MicrophonePort } from '../application/ports';
import { SPEAKING_THRESHOLD } from '../domain/models';

export class BrowserMicrophone implements MicrophonePort {
  async getMicrophone(): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Trình duyệt không hỗ trợ micro');
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
  }
}

interface Watched {
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  timer: ReturnType<typeof setInterval>;
}

/** Đo âm lượng bằng Web Audio API để làm hiệu ứng viền sáng khi ai đó đang nói. */
export class WebAudioLevelMeter implements AudioLevelMeter {
  private ctx: AudioContext | null = null;
  private watched = new Map<string, Watched>();

  watch(id: string, stream: MediaStream, onSpeaking: (speaking: boolean) => void): void {
    this.unwatch(id);
    if (stream.getAudioTracks().length === 0) return;
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      const source = this.ctx.createMediaStreamSource(stream);
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      let last = false;
      let quietFrames = Number.MAX_SAFE_INTEGER;
      const timer = setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        const rms = Math.sqrt(sum / buf.length);
        // Giữ trạng thái "đang nói" thêm vài khung để tránh nhấp nháy
        quietFrames = rms > SPEAKING_THRESHOLD ? 0 : quietFrames + 1;
        const speaking = quietFrames < 4;
        if (speaking !== last) {
          last = speaking;
          onSpeaking(speaking);
        }
      }, 100);
      this.watched.set(id, { source, analyser, timer });
    } catch (err) {
      console.warn('[voice] không đo được âm lượng', err);
    }
  }

  unwatch(id: string): void {
    const w = this.watched.get(id);
    if (!w) return;
    clearInterval(w.timer);
    w.source.disconnect();
    this.watched.delete(id);
  }

  unwatchAll(): void {
    for (const id of [...this.watched.keys()]) this.unwatch(id);
  }
}
