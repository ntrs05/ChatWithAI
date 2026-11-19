import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MessageCircleOff } from 'lucide-react';
import { ChatView } from '@/modules/chat';
import { Spinner } from '@/shared/ui';
import { useDirectStore } from '../application/directStore';
import { blockedReason } from '../domain/rules';
import { directService } from '../module';

/** Trang một cuộc trò chuyện 1-1 (route /app/dm/:conversationId). Dùng lại ChatView của module Chat. */
export function DirectPage({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const { conversationId = '' } = useParams();
  const loaded = useDirectStore((s) => s.loaded);
  const chat = useDirectStore((s) => s.chats.find((c) => c.id === conversationId));

  useEffect(() => {
    if (!chat) return;
    directService().setActive(chat.id);
    return () => directService().setActive(null);
    // chỉ chạy lại khi đổi cuộc trò chuyện (không phải mỗi lần có tin mới làm đổi object chat)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.id]);

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center bg-ink-800">
        <Spinner className="text-brand-400" />
      </div>
    );
  }
  if (!chat) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-ink-800 p-6 text-center text-muted">
        <MessageCircleOff size={36} className="text-brand-300" />
        <p className="font-semibold text-slate-200">Không tìm thấy cuộc trò chuyện</p>
        <Link to="/app/friends" className="text-sm font-semibold text-brand-300 hover:underline">
          Về danh sách bạn bè
        </Link>
      </div>
    );
  }

  return (
    <ChatView
      variant="direct"
      peerAvatarUrl={chat.user.avatarUrl}
      disabledReason={blockedReason(chat) ?? undefined}
      // Chat 1-1: cả hai người đều ghim được; chỉ xóa được tin của chính mình
      permissions={{ canPin: true, canDeleteOthers: false }}
      channel={{ id: chat.id, serverId: '', name: chat.user.displayName, topic: '' }}
      membersOpen={false}
      onToggleMembers={() => {}}
      onOpenSidebar={onOpenSidebar}
    />
  );
}
