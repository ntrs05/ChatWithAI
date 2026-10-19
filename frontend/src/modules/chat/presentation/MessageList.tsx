import { Fragment, useEffect, useLayoutEffect, useRef } from 'react';
import { Hash } from 'lucide-react';
import { art } from '@/shared/assets';
import { formatDay, isSameDay } from '@/shared/lib';
import { Spinner } from '@/shared/ui';
import { emptyHistory, useChatStore } from '../application/chatStore';
import { startsGroup } from '../domain/rules';
import { chatService } from '../module';
import { MessageItem } from './MessageItem';

const NEAR_BOTTOM = 120;
const NEAR_TOP = 150;

/** UC05 — Danh sách tin nhắn + cuộn lên để tải lịch sử cũ hơn. */
export function MessageList({ channelId, channelName }: { channelId: string; channelName: string }) {
  const history = useChatStore((s) => s.history[channelId]) ?? emptyHistory;
  const meId = useChatStore((s) => s.me?.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  /** Khoảng cách tới đáy trước khi chèn tin cũ — để giữ nguyên vị trí đọc */
  const restoreFromBottom = useRef<number | null>(null);

  useEffect(() => {
    stickToBottom.current = true;
    restoreFromBottom.current = null;
  }, [channelId]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (restoreFromBottom.current !== null) {
      el.scrollTop = el.scrollHeight - restoreFromBottom.current;
      restoreFromBottom.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
    // Nội dung chưa đủ dài để cuộn → tự tải thêm lịch sử
    if (el.scrollHeight <= el.clientHeight && history.loaded && history.hasMore && !history.loading) {
      void chatService().loadOlder(channelId);
    }
  }, [history.messages, history.loaded, history.hasMore, history.loading, channelId]);

  // Ảnh tải xong làm thay đổi chiều cao → giữ ở đáy nếu đang ở đáy
  useEffect(() => {
    const el = scrollRef.current;
    const content = contentRef.current;
    if (!el || !content) return;
    const ro = new ResizeObserver(() => {
      if (stickToBottom.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM;
    if (el.scrollTop < NEAR_TOP && history.hasMore && !history.loading && history.loaded) {
      restoreFromBottom.current = el.scrollHeight - el.scrollTop;
      void chatService().loadOlder(channelId);
    }
  };

  const { messages } = history;

  return (
    <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto overflow-x-hidden" aria-live="polite">
      <div ref={contentRef} className="flex min-h-full flex-col justify-end pb-4">
        {history.loaded && !history.hasMore ? (
          <div className="px-4 pb-4 pt-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-600">
              <img src={art.speechBalloon} alt="" className="h-11 w-11" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-extrabold text-white sm:text-3xl">
              Chào mừng đến với{' '}
              <span className="whitespace-nowrap">
                <Hash size={26} className="inline -mt-1 text-brand-300" />
                {channelName}!
              </span>
            </h2>
            <p className="mt-1 text-muted">Đây là điểm bắt đầu của kênh #{channelName}.</p>
          </div>
        ) : (
          <div className="flex justify-center py-4">{(history.loading || !history.loaded) && <Spinner className="text-brand-400" />}</div>
        )}

        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || !isSameDay(new Date(prev.createdAt), new Date(m.createdAt));
          return (
            <Fragment key={m.nonce ?? m.id}>
              {newDay && (
                <div className="relative mx-4 my-4 flex items-center" role="separator">
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="px-3 text-xs font-semibold text-muted">{formatDay(m.createdAt)}</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>
              )}
              <MessageItem message={m} showHeader={newDay || startsGroup(prev, m)} isMine={m.author.id === meId} />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
