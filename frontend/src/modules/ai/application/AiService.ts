import type { AppEventBus } from '@/shared/event-bus';
import { errorMessage } from '@/shared/http';
import type { AiGateway } from './ports';
import { resetAiStore, useAiStore } from './aiStore';

/** UC09 — Tóm tắt tin nhắn bằng AI (User yêu cầu → AI Service xử lý). */
export class AiService {
  private requestSeq = 0;

  constructor(
    private readonly gateway: AiGateway,
    private readonly bus: AppEventBus,
  ) {
    bus.subscribe('auth.loggedOut', () => resetAiStore());
    // Đổi kênh → bản tóm tắt cũ không còn đúng ngữ cảnh
    bus.subscribe('channel.selected', ({ channel }) => {
      const s = useAiStore.getState();
      if (s.channelId && s.channelId !== channel.id) {
        useAiStore.setState({ panelOpen: false, channelId: null, status: 'idle', summary: null, error: null });
      }
    });
  }

  open(channelId: string): void {
    const s = useAiStore.getState();
    useAiStore.setState({ panelOpen: true, channelId });
    if (s.channelId !== channelId || s.status === 'idle') void this.summarize(channelId, s.limit);
  }

  close(): void {
    useAiStore.setState({ panelOpen: false });
  }

  async summarize(channelId: string, limit: number): Promise<void> {
    const seq = ++this.requestSeq;
    useAiStore.setState({ channelId, limit, status: 'loading', error: null });
    this.bus.publish('ai.summary.requested', { channelId, limit });
    try {
      const summary = await this.gateway.summarize({ channelId, limit });
      if (seq !== this.requestSeq) return; // đã có yêu cầu mới hơn
      useAiStore.setState({ status: 'done', summary });
      this.bus.publish('ai.summary.completed', { summary });
    } catch (err) {
      if (seq !== this.requestSeq) return;
      const message = errorMessage(err, 'AI Service không phản hồi');
      useAiStore.setState({ status: 'error', error: message });
      this.bus.publish('ai.summary.failed', { channelId, message });
    }
  }
}
