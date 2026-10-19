import { config } from '@/shared/config';
import type { AppEventBus } from '@/shared/event-bus';
import { ApiError, errorMessage } from '@/shared/http';
import { uid } from '@/shared/lib';
import { topics, type RealtimeHub } from '@/shared/realtime';
import type { Attachment, Message } from '../domain/models';
import { mergeMessages, validateFile, validateOutgoing } from '../domain/rules';
import type { FileStorage, MessageRepository } from './ports';
import { emptyHistory, patchHistory, resetChatStore, useChatStore } from './chatStore';

const TYPING_TTL = 4000;
const TYPING_THROTTLE = 2500;

/**
 * UC04 Gửi/Nhận tin nhắn · UC05 Xem lịch sử · UC06 Tải lên file/hình ảnh.
 */
export class ChatService {
  private lastTypingSent = 0;
  private urlCache = new Map<string, Promise<string>>();

  constructor(
    private readonly repo: MessageRepository,
    private readonly files: FileStorage,
    private readonly bus: AppEventBus,
    private readonly hub: RealtimeHub,
  ) {
    bus.subscribe('auth.loggedIn', ({ user }) =>
      useChatStore.setState({
        me: { id: user.id, displayName: user.displayName, username: user.username, avatarUrl: user.avatarUrl },
      }),
    );
    bus.subscribe('auth.loggedOut', () => {
      this.urlCache.clear();
      resetChatStore();
    });
    // Người dùng mở kênh text → tải lịch sử (UC05)
    bus.subscribe('channel.selected', ({ channel }) => {
      if (channel.type === 'text') void this.loadInitial(channel.id);
    });
    // Tin nhắn mới (từ chính mình hoặc người khác qua realtime) → cập nhật danh sách (UC04)
    bus.subscribe('chat.message.created', ({ message }) => {
      const h = useChatStore.getState().history[message.channelId];
      if (h?.loaded) patchHistory(message.channelId, (cur) => ({ messages: mergeMessages(cur.messages, [message]) }));
      this.clearTyping(message.channelId, message.author.id);
    });
    bus.subscribe('chat.typing', ({ channelId, userId, displayName }) => {
      if (userId === useChatStore.getState().me?.id) return;
      useChatStore.setState((s) => ({
        typing: {
          ...s.typing,
          [channelId]: { ...s.typing[channelId], [userId]: { name: displayName, until: Date.now() + TYPING_TTL } },
        },
      }));
      setTimeout(() => this.pruneTyping(channelId), TYPING_TTL + 50);
    });
  }

  async loadInitial(channelId: string): Promise<void> {
    const h = useChatStore.getState().history[channelId];
    if (h?.loaded || h?.loading) return;
    patchHistory(channelId, () => ({ loading: true }));
    try {
      const page = await this.repo.list(channelId, { limit: config.messagePageSize });
      patchHistory(channelId, (cur) => ({
        messages: mergeMessages(page.messages, cur.messages),
        hasMore: page.hasMore,
        loaded: true,
        loading: false,
      }));
    } catch (err) {
      patchHistory(channelId, () => ({ loading: false }));
      this.bus.publish('ui.toast', { kind: 'error', message: errorMessage(err, 'Không tải được tin nhắn') });
    }
  }

  /** UC05 — cuộn lên để xem tin nhắn cũ hơn. */
  async loadOlder(channelId: string): Promise<void> {
    const h = useChatStore.getState().history[channelId] ?? emptyHistory;
    if (!h.loaded || h.loading || !h.hasMore) return;
    const oldest = h.messages.find((m) => !m.status);
    patchHistory(channelId, () => ({ loading: true }));
    try {
      const page = await this.repo.list(channelId, { before: oldest?.id, limit: config.messagePageSize });
      patchHistory(channelId, (cur) => ({
        messages: mergeMessages(cur.messages, page.messages),
        hasMore: page.hasMore,
        loading: false,
      }));
    } catch (err) {
      patchHistory(channelId, () => ({ loading: false }));
      this.bus.publish('ui.toast', { kind: 'error', message: errorMessage(err) });
    }
  }

  search(channelId: string, query: string): Promise<Message[]> {
    return this.repo.search(channelId, query.trim());
  }

  /** Nhảy tới một tin nhắn cũ: tải dần lịch sử cho tới khi thấy (tối đa 20 trang). */
  async ensureLoaded(channelId: string, messageId: string): Promise<boolean> {
    for (let i = 0; i < 20; i++) {
      const h = useChatStore.getState().history[channelId];
      if (h?.messages.some((m) => m.id === messageId)) return true;
      if (!h?.hasMore) return false;
      await this.loadOlder(channelId);
    }
    return false;
  }

  /**
   * UC04 + UC06 — gửi tin nhắn kèm tệp.
   * Tệp được tải lên trước (báo tiến độ), sau đó tin nhắn hiển thị "lạc quan" ngay lập tức.
   */
  async send(
    target: { channelId: string; serverId: string },
    content: string,
    files: File[],
    onFileProgress?: (index: number, ratio: number) => void,
  ): Promise<void> {
    const me = useChatStore.getState().me;
    if (!me) throw new ApiError('Bạn chưa đăng nhập', 401);
    const invalid = validateOutgoing(content, files.length) ?? files.map((f) => validateFile(f, config.maxUploadBytes)).find(Boolean);
    if (invalid) throw new ApiError(invalid, 400);

    const attachments: Attachment[] = [];
    for (const [i, file] of files.entries()) {
      attachments.push(await this.files.upload(file, (r) => onFileProgress?.(i, r)));
    }

    const optimistic: Message = {
      id: `local-${uid()}`,
      nonce: uid('n'),
      channelId: target.channelId,
      serverId: target.serverId,
      author: me,
      content: content.trim(),
      attachments,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    patchHistory(target.channelId, (cur) => ({ messages: mergeMessages(cur.messages, [optimistic]) }));
    await this.deliver(optimistic);
  }

  /** Gửi lại tin nhắn bị lỗi. */
  async retry(message: Message): Promise<void> {
    patchHistory(message.channelId, (cur) => ({
      messages: cur.messages.map((m) => (m.nonce === message.nonce ? { ...m, status: 'sending' as const } : m)),
    }));
    await this.deliver(message);
  }

  /** Báo "đang gõ…" (throttle) — sự kiện tạm thời, đi thẳng qua kênh Pub-Sub. */
  notifyTyping(channelId: string, serverId: string): void {
    const me = useChatStore.getState().me;
    if (!me || Date.now() - this.lastTypingSent < TYPING_THROTTLE) return;
    this.lastTypingSent = Date.now();
    this.hub.publish(topics.server(serverId), 'chat.typing', { channelId, userId: me.id, displayName: me.displayName });
  }

  resolveAttachmentUrl(attachment: Attachment): Promise<string> {
    let p = this.urlCache.get(attachment.id);
    if (!p) {
      p = this.files.resolveUrl(attachment);
      this.urlCache.set(attachment.id, p);
    }
    return p;
  }

  private async deliver(msg: Message): Promise<void> {
    try {
      const saved = await this.repo.send(msg.channelId, {
        content: msg.content,
        attachmentIds: msg.attachments.map((a) => a.id),
        nonce: msg.nonce!,
      });
      patchHistory(msg.channelId, (cur) => ({ messages: mergeMessages(cur.messages, [{ ...saved, nonce: msg.nonce, status: undefined }]) }));
      this.lastTypingSent = 0;
    } catch (err) {
      patchHistory(msg.channelId, (cur) => ({
        messages: cur.messages.map((m) => (m.nonce === msg.nonce ? { ...m, status: 'failed' as const } : m)),
      }));
      this.bus.publish('ui.toast', { kind: 'error', message: errorMessage(err, 'Gửi tin nhắn thất bại') });
    }
  }

  private clearTyping(channelId: string, userId: string) {
    const t = useChatStore.getState().typing[channelId];
    if (!t?.[userId]) return;
    const { [userId]: _gone, ...rest } = t;
    void _gone;
    useChatStore.setState((s) => ({ typing: { ...s.typing, [channelId]: rest } }));
  }

  private pruneTyping(channelId: string) {
    const t = useChatStore.getState().typing[channelId];
    if (!t) return;
    const now = Date.now();
    const rest = Object.fromEntries(Object.entries(t).filter(([, v]) => v.until > now));
    useChatStore.setState((s) => ({ typing: { ...s.typing, [channelId]: rest } }));
  }
}
