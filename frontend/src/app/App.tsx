import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AdminPage } from '@/modules/admin';
import { IdentityBadge, LoginPage, RegisterPage, useAuthStore } from '@/modules/auth';
import { DirectPage, MessageButton, useDirectStore } from '@/modules/direct';
import { NotificationsView, type AppNotification } from '@/modules/notifications';
import { FriendsView } from '@/modules/friends';
import { DiscoverPage, serverService, useServerStore } from '@/modules/server';
import { Toaster, useSettingsModal } from '@/shared/ui';
import { pathForNotification } from './notificationNavigation';
import { useUiStore } from './uiStore';
import { GuestOnly, RequireAuth } from './guards';
import { AppShell } from './layouts/AppShell';
import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';
import { ServerPage } from './pages/ServerPage';

/** Trang Bạn bè: ghép "Nhắn tin" (Direct) và thẻ "Tên và ID của bạn" (Auth) vào qua slot. */
function FriendsRoute() {
  const user = useAuthStore((s) => s.user);
  return (
    <FriendsView
      renderFriendActions={(f) => <MessageButton userId={f.user.id} />}
      selfCard={user ? <IdentityBadge user={user} /> : undefined}
    />
  );
}

/** Trang Thông báo: bấm một thông báo thì mở đúng nơi (chat 1-1, kênh, bạn bè, Trang chủ…). */
function NotificationsRoute() {
  const navigate = useNavigate();

  const open = async (n: AppNotification) => {
    const context = () => ({
      directIds: new Set(useDirectStore.getState().chats.map((c) => c.id)),
      serverOfChannel: (channelId: string) => {
        const { channels } = useServerStore.getState();
        return Object.keys(channels).find((sid) => channels[sid]?.some((c) => c.id === channelId)) ?? null;
      },
    });
    let path = pathForNotification(n, context());
    if (!path) {
      // Chưa biết kênh thuộc server nào (chưa mở server đó trong phiên này): tải kênh của từng server rồi tìm lại.
      for (const s of useServerStore.getState().servers) {
        if (useServerStore.getState().channels[s.id]) continue;
        await serverService().ensureServerData(s.id).catch(() => {});
        path = pathForNotification(n, context());
        if (path) break;
      }
    }
    navigate(path ?? '/app');
  };

  return <NotificationsView onOpen={(n) => void open(n)} />;
}

/** Trang Quản trị: chỉ admin hệ thống; người khác bị đưa về Trang chủ (backend vẫn chặn ở từng API). */
function AdminRoute() {
  const user = useAuthStore((s) => s.user);
  return user?.isAdmin ? <AdminPage /> : <Navigate to="/app" replace />;
}

/** Đường dẫn cũ /app/settings: mở popup Cài đặt rồi quay về Trang chủ. */
function OpenSettings() {
  useEffect(() => useSettingsModal.getState().show(), []);
  return <Navigate to="/app" replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
        <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<HomePage />} />
          <Route path="friends" element={<FriendsRoute />} />
          <Route path="notifications" element={<NotificationsRoute />} />
          <Route path="settings" element={<OpenSettings />} />
          <Route path="admin" element={<AdminRoute />} />
          <Route path="dm/:conversationId" element={<DirectPage onOpenSidebar={() => useUiStore.setState({ sidebarOpen: true })} />} />
          <Route path="discover" element={<div className="flex-1"><DiscoverPage /></div>} />
          <Route path=":serverId" element={<ServerPage />} />
          <Route path=":serverId/:channelId" element={<ServerPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
