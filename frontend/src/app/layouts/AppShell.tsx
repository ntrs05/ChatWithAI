import { useEffect } from 'react';
import { matchPath, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Home, Menu } from 'lucide-react';
import { UserPanel } from '@/modules/auth';
import { ChannelSidebar, ServerRail, serverService, useServerStore } from '@/modules/server';
import { VoiceAudioSink, VoiceChannelParticipants, VoiceControls, VoiceStatusPanel, useVoiceStore } from '@/modules/voice';
import { cn } from '@/shared/lib';
import { Logo } from '@/shared/ui';
import { useUiStore } from '../uiStore';

/**
 * Bố cục ứng dụng. Đây là nơi GHÉP giao diện của nhiều module qua "slot":
 *  - ChannelSidebar (server) nhận VoiceChannelParticipants (voice) qua renderVoiceExtra
 *  - UserPanel (auth) nhận VoiceControls (voice) qua actions
 */
export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const voiceChannel = useVoiceStore((s) => s.channel);
  const servers = useServerStore((s) => s.servers);

  const match = matchPath('/app/:segment/*', pathname);
  const segment = match?.params.segment;
  const view: 'home' | 'discover' | 'server' = !segment ? 'home' : segment === 'discover' ? 'discover' : 'server';

  useEffect(() => {
    useUiStore.setState({ sidebarOpen: false });
    if (view !== 'server') serverService().clearActive();
  }, [pathname, view]);

  const closeSidebar = () => useUiStore.setState({ sidebarOpen: false });
  const footer = (
    <>
      <VoiceStatusPanel
        serverName={servers.find((s) => s.id === voiceChannel?.serverId)?.name}
        onOpen={() => voiceChannel && navigate(`/app/${voiceChannel.serverId}/${voiceChannel.id}`)}
      />
      <UserPanel actions={<VoiceControls />} />
    </>
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-ink-900 text-slate-100">
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex transition-transform duration-200 md:static md:z-auto md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <ServerRail view={view} />
        {view === 'server' && segment ? (
          <ChannelSidebar
            serverId={segment}
            renderVoiceExtra={(c) => <VoiceChannelParticipants channelId={c.id} />}
            footer={footer}
            onNavigate={closeSidebar}
          />
        ) : (
          <aside className="flex w-64 shrink-0 flex-col bg-ink-850">
            <div className="flex h-14 items-center border-b border-black/20 px-4">
              <Logo size={26} />
            </div>
            <nav className="flex-1 space-y-1 p-2">
              {[
                { to: '/app', label: 'Trang chủ', icon: Home, active: view === 'home' },
                { to: '/app/discover', label: 'Khám phá server', icon: Compass, active: view === 'discover' },
              ].map((item) => (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[15px] transition',
                    item.active ? 'bg-brand-400/15 text-white' : 'text-muted hover:bg-white/5 hover:text-white',
                  )}
                >
                  <item.icon size={19} className={item.active ? 'text-brand-300' : ''} /> {item.label}
                </button>
              ))}
            </nav>
            {footer}
          </aside>
        )}
      </div>
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-ink-950/70 md:hidden" onClick={closeSidebar} />}

      <main className="relative flex min-w-0 flex-1">
        {view !== 'server' && (
          <button
            onClick={() => useUiStore.setState({ sidebarOpen: true })}
            aria-label="Mở menu"
            className="absolute left-3 top-3 z-20 rounded-lg bg-ink-950/70 p-2 text-white md:hidden"
          >
            <Menu size={20} />
          </button>
        )}
        <Outlet />
      </main>
      <VoiceAudioSink />
    </div>
  );
}
