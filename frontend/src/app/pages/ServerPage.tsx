import { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { SummarizeButton, SummaryPanel, useAiStore } from '@/modules/ai';
import { ChatView } from '@/modules/chat';
import { MemberList, serverService, useServerStore } from '@/modules/server';
import { VoiceRoomView } from '@/modules/voice';
import { errorMessage } from '@/shared/http';
import { toast } from '@/shared/event-bus';
import { Spinner } from '@/shared/ui';
import { useUiStore } from '../uiStore';

/**
 * Trang một server: chọn kênh theo URL rồi hiển thị
 *   - kênh text  → ChatView (chat) + nút/panel Tóm tắt (ai) + danh sách thành viên (server)
 *   - kênh voice → VoiceRoomView (voice)
 */
export function ServerPage() {
  const { serverId = '', channelId } = useParams();
  const navigate = useNavigate();
  const serversLoaded = useServerStore((s) => s.serversLoaded);
  const isMember = useServerStore((s) => s.servers.some((x) => x.id === serverId));
  const channel = useServerStore((s) => s.channels[serverId]?.find((c) => c.id === channelId) ?? null);
  const membersOpen = useUiStore((s) => s.membersOpen);
  const aiOpen = useAiStore((s) => s.panelOpen && s.channelId === channelId);

  useEffect(() => {
    if (!serversLoaded || !isMember) return;
    let cancelled = false;
    serverService()
      .open(serverId, channelId)
      .then((target) => {
        if (!cancelled && target && target.id !== channelId) navigate(`/app/${serverId}/${target.id}`, { replace: true });
      })
      .catch((err) => toast.error(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [serverId, channelId, serversLoaded, isMember, navigate]);

  if (serversLoaded && !isMember) return <Navigate to="/app" replace />;
  if (!channel) {
    return (
      <div className="flex flex-1 items-center justify-center bg-ink-800">
        <Spinner className="text-brand-400" />
      </div>
    );
  }

  const openSidebar = () => useUiStore.setState({ sidebarOpen: true });

  if (channel.type === 'voice') {
    return <VoiceRoomView channel={{ id: channel.id, serverId, name: channel.name }} onOpenSidebar={openSidebar} />;
  }

  return (
    <>
      <ChatView
        channel={channel}
        headerActions={<SummarizeButton channelId={channel.id} />}
        membersOpen={membersOpen}
        onToggleMembers={() => useUiStore.setState({ membersOpen: !membersOpen })}
        onOpenSidebar={openSidebar}
      />
      {aiOpen ? (
        <aside className="fixed inset-y-0 right-0 z-30 w-[min(360px,92vw)] border-l border-white/5 bg-ink-850 shadow-2xl lg:static lg:shadow-none">
          <SummaryPanel channelName={channel.name} />
        </aside>
      ) : (
        membersOpen && (
          <aside className="hidden w-60 shrink-0 bg-ink-850 xl:block">
            <MemberList serverId={serverId} />
          </aside>
        )
      )}
    </>
  );
}
