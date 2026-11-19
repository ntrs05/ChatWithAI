import { useEffect } from 'react';
import { matchPath, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Compass, Home, Menu, ShieldCheck, Users } from 'lucide-react';
import { UserPanel, useAuthStore } from '@/modules/auth';
import { DirectList, selectUnreadChats, useDirectStore } from '@/modules/direct';
import { selectUnread, useNotificationStore } from '@/modules/notifications';
import { FriendPicker, selectIncomingCount, useFriendStore } from '@/modules/friends';
import { ChannelSidebar, ServerRail, serverService, useServerStore, type Server } from '@/modules/server';
import { VoiceAudioSink, VoiceChannelParticipants, VoiceControls, VoiceStatusPanel, useVoiceStore } from '@/modules/voice';
import { cn } from '@/shared/lib';
import { Logo } from '@/shared/ui';
import { useUiStore } from '../uiStore';
import { SettingsModal } from './SettingsModal';

/**
 * Bố cục ứng dụng. Đây là nơi GHÉP giao diện của nhiều module qua "slot":
 *  - ChannelSidebar (server) nhận VoiceChannelParticipants (voice) qua renderVoiceExtra
 *  - UserPanel (auth) nhận VoiceControls (voice) qua actions
 *  - InviteModal (server) nhận danh sách bạn bè (friends) qua renderInviteExtra
 */
export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const voiceChannel = useVoiceStore((s) => s.channel);
  const servers = useServerStore((s) => s.servers);
  const incomingFriends = useFriendStore(selectIncomingCount);
  const unreadChats = useDirectStore(selectUnreadChats);
  const unreadNotifications = useNotificationStore(selectUnread);
  const isAdmin = useAuthStore((s) => !!s.user?.isAdmin);

  const match = matchPath('/app/:segment/*', pathname);
  const segment = match?.params.segment;
  const homeViews = ['discover', 'friends', 'settings', 'dm', 'notifications', 'admin'] as const;
  type View = 'home' | 'server' | (typeof homeViews)[number];
  const view: View = !segment ? 'home' : (homeViews as readonly string[]).includes(segment) ? (segment as View) : 'server';

  useEffect(() => {
    useUiStore.setState({ sidebarOpen: false });
    if (view !== 'server') serverService().clearActive();
  }, [pathname, view]);

  const closeSidebar = () => useUiStore.setState({ sidebarOpen: false });

  /** "Mời bạn bè": chọn từ danh sách bạn → gửi lời mời vào server (người kia nhận thông báo và tự đồng ý). */
  const renderInviteExtra = (server: Server) => (
    <FriendPicker
      actionLabel="Mời"
      doneLabel="Đã mời"
      onAction={(friend) => serverService().inviteFriend(server.id, friend.user.id)}
    />
  );
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
        <ServerRail
          view={view}
          renderInviteExtra={renderInviteExtra}
          extras={[
            {
              key: 'friends',
              label: 'Bạn bè',
              active: view === 'friends',
              badge: incomingFriends + unreadChats,
              icon: <Users size={22} className="text-emerald-300" />,
              onClick: () => navigate('/app/friends'),
            },
            {
              key: 'notifications',
              label: 'Thông báo',
              active: view === 'notifications',
              badge: unreadNotifications,
              icon: <Bell size={22} className="text-amber-300" />,
              onClick: () => navigate('/app/notifications'),
            },
          ]}
        />
        {view === 'server' && segment ? (
          <ChannelSidebar
            serverId={segment}
            renderInviteExtra={renderInviteExtra}
            renderVoiceExtra={(c) => <VoiceChannelParticipants channelId={c.id} />}
            footer={footer}
            onNavigate={closeSidebar}
          />
        ) : (
          <aside className="flex w-64 shrink-0 flex-col bg-ink-850">
            <div className="flex h-14 items-center border-b border-black/20 px-4">
              <Logo size={26} />
            </div>
            <nav className="space-y-1 p-2">
              {[
                { to: '/app', label: 'Trang chủ', icon: Home, active: view === 'home' },
                { to: '/app/friends', label: 'Bạn bè', icon: Users, active: view === 'friends', badge: incomingFriends },
                { to: '/app/notifications', label: 'Thông báo', icon: Bell, active: view === 'notifications', badge: unreadNotifications },
                { to: '/app/discover', label: 'Khám phá server', icon: Compass, active: view === 'discover' },
                ...(isAdmin ? [{ to: '/app/admin', label: 'Quản trị', icon: ShieldCheck, active: view === 'admin', badge: 0 }] : []),
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
                  {!!item.badge && (
                    <span className="ml-auto rounded-full bg-nova-500 px-1.5 text-[11px] font-bold leading-[18px] text-white">{item.badge}</span>
                  )}
                </button>
              ))}
            </nav>
            <DirectList onNavigate={closeSidebar} />
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
      <SettingsModal />
    </div>
  );
}
